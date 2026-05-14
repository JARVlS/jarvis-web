import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";
import { streamChatMessage } from "../services/jarvisApi";
import type { ChatMessage, ChatRole } from "../types/jarvis";

const CHAT_HISTORY_KEY = "jarvis.chatHistory.v1";
const CHAT_SESSION_KEY = "jarvis.chatSession.v1";

interface UseJarvisChatOptions {
  isWorkstationOnline: Readonly<Ref<boolean>>;
  onAuthFailure: (message?: string) => void;
  onUiClear: () => void;
  onUiError: (message: string) => void;
}

function generateUUID(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function messageId() {
  return generateUUID();
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

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: messageId(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function useJarvisChat(options: UseJarvisChatOptions) {
  const chatHistory = ref<ChatMessage[]>([]);
  const chatLoading = ref(false);
  const sessionId = ref<string>();
  const streamingAssistantMessage = ref<ChatMessage | null>(null);
  const messages = computed(() =>
    streamingAssistantMessage.value
      ? [...chatHistory.value, streamingAssistantMessage.value]
      : chatHistory.value,
  );

  let streamController: AbortController | null = null;

  function addMessage(role: ChatRole, content: string) {
    const message = createMessage(role, content);
    chatHistory.value.push(message);
    return message;
  }

  function addSystemMessage(content: string) {
    addMessage("system", content);
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
    } else {
      sessionId.value = generateUUID();
    }
  }

  function clearHistory() {
    chatHistory.value = [];
    sessionId.value = generateUUID();
    streamingAssistantMessage.value = null;
  }

  function reset() {
    streamController?.abort();
    streamController = null;
    chatLoading.value = false;
    streamingAssistantMessage.value = null;
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
    streamingAssistantMessage.value = createMessage("assistant", "");
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
          if (streamingAssistantMessage.value) {
            streamingAssistantMessage.value.content = text;
          }
        },
        onTextDelta: (delta) => {
          if (streamingAssistantMessage.value) {
            streamingAssistantMessage.value.content += delta;
          }
        },
      });

      const finalText = streamingAssistantMessage.value?.content.trim()
        ? streamingAssistantMessage.value.content
        : result.finalText.trim();

      streamingAssistantMessage.value = null;

      if (!finalText) {
        addSystemMessage("Assistant returned no reply.");
        return;
      }

      addMessage("assistant", finalText);
    } catch (error) {
      streamingAssistantMessage.value = null;

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
    messages,
    reset,
    sendMessage,
    sessionId,
  };
}
