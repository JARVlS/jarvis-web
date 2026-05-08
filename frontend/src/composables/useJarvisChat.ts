import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import { streamChatMessage } from "../services/jarvisApi";
import type {
  ChatMessage,
  ChatRole,
  ChatStreamEvent,
  ChatStreamResult,
} from "../types/jarvis";

const CHAT_HISTORY_KEY = "jarvis.chatHistory.v1";
const CHAT_SESSION_KEY = "jarvis.chatSession.v1";

interface UseJarvisChatOptions {
  isWorkstationOnline: Readonly<Ref<boolean>>;
  onAuthFailure: (message?: string) => void;
  onUiClear: () => void;
  onUiError: (message: string) => void;
}

function messageId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isStoredChatMessage(entry: unknown): entry is ChatMessage {
  return (
    !!entry &&
    typeof entry === "object" &&
    typeof (entry as { id?: unknown }).id === "string" &&
    typeof (entry as { role?: unknown }).role === "string" &&
    typeof (entry as { content?: unknown }).content === "string" &&
    typeof (entry as { createdAt?: unknown }).createdAt === "string"
  );
}

function extractFallbackText(event: ChatStreamEvent): string | undefined {
  const candidates = ["reply_text", "reply", "message", "content", "text"] as const;
  for (const key of candidates) {
    const value = event[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function extractResultText(result: ChatStreamResult): string | undefined {
  if (result.finalText?.trim()) {
    return result.finalText;
  }

  for (const event of [...result.events].reverse()) {
    const text = extractFallbackText(event);
    if (text?.trim()) {
      return text;
    }
  }

  return undefined;
}

export function useJarvisChat(options: UseJarvisChatOptions) {
  const chatHistory = ref<ChatMessage[]>([]);
  const chatLoading = ref(false);
  const sessionId = ref<string>();

  let streamController: AbortController | null = null;

  function addMessage(role: ChatRole, content: string) {
    const message: ChatMessage = {
      id: messageId(),
      role,
      content,
      createdAt: new Date().toISOString(),
    };

    chatHistory.value.push(message);
    return message;
  }

  function addSystemMessage(content: string) {
    addMessage("system", content);
  }

  function removeMessage(id: string) {
    chatHistory.value = chatHistory.value.filter((entry) => entry.id !== id);
  }

  function hydrateStoredChat() {
    const rawHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (rawHistory) {
      try {
        const parsed = JSON.parse(rawHistory) as unknown;
        if (Array.isArray(parsed)) {
          chatHistory.value = parsed.filter(isStoredChatMessage);
        }
      } catch {
        localStorage.removeItem(CHAT_HISTORY_KEY);
      }
    }

    const rawSession = localStorage.getItem(CHAT_SESSION_KEY);
    if (rawSession) {
      sessionId.value = rawSession;
    }
  }

  function clearHistory() {
    chatHistory.value = [];
    sessionId.value = undefined;
  }

  function reset() {
    streamController?.abort();
    streamController = null;
    chatLoading.value = false;
    clearHistory();
  }

  async function sendMessage(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !options.isWorkstationOnline.value || chatLoading.value) {
      return;
    }

    options.onUiClear();
    chatLoading.value = true;

    addMessage("user", trimmedMessage);
    const assistantMessage = addMessage("assistant", "");
    const controller = new AbortController();
    streamController = controller;

    try {
      const result = await streamChatMessage(trimmedMessage, {
        sessionId: sessionId.value,
        signal: controller.signal,
        onSessionId: (nextSessionId) => {
          sessionId.value = nextSessionId;
        },
        onText: (text) => {
          assistantMessage.content = text;
        },
        onTextDelta: (delta) => {
          assistantMessage.content += delta;
        },
      });

      if (!assistantMessage.content.trim()) {
        const fallbackText = extractResultText(result);
        if (fallbackText) {
          assistantMessage.content = fallbackText;
        }
      }

      if (!assistantMessage.content.trim()) {
        removeMessage(assistantMessage.id);
        addSystemMessage("Assistant returned no reply.");
      }
    } catch (error) {
      removeMessage(assistantMessage.id);

      if (isAbortError(error)) {
        return;
      }

      const messageText =
        error instanceof Error ? error.message : "Chat request could not be completed.";
      if (messageText.includes("Authentication required")) {
        options.onAuthFailure(messageText);
        return;
      }

      options.onUiError(messageText);
      addSystemMessage(messageText);
    } finally {
      if (streamController === controller) {
        streamController = null;
      }

      chatLoading.value = false;
    }
  }

  watch(
    chatHistory,
    (messages) => {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    },
    { deep: true },
  );

  watch(sessionId, (nextValue) => {
    if (nextValue) {
      localStorage.setItem(CHAT_SESSION_KEY, nextValue);
    } else {
      localStorage.removeItem(CHAT_SESSION_KEY);
    }
  });

  onBeforeUnmount(() => {
    streamController?.abort();
  });

  return {
    addSystemMessage,
    chatHistory,
    chatLoading,
    clearHistory,
    hydrateStoredChat,
    reset,
    sendMessage,
    sessionId,
  };
}
