<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ChatPanel from "./components/ChatPanel.vue";
import PowerControls from "./components/PowerControls.vue";
import StatusIndicator from "./components/StatusIndicator.vue";
import { fetchStatus, sendChatMessage, sendPowerAction } from "./services/jarvisApi";
import type {
  ChatMessage,
  ChatResponse,
  ChatRole,
  PowerAction,
  WorkstationHealth,
  WorkstationStatusState,
} from "./types/jarvis";

const STATUS_POLL_INTERVAL_MS = 8_000;
const CHAT_HISTORY_KEY = "jarvis.chatHistory.v1";
const CHAT_SESSION_KEY = "jarvis.chatSession.v1";

const status = ref<WorkstationStatusState>("checking");
const lastCheckedAt = ref<string | null>(null);
const chatLoading = ref(false);
const powerLoadingAction = ref<PowerAction | null>(null);
const uiError = ref<string>("");
const chatHistory = ref<ChatMessage[]>([]);
const sessionId = ref<string | undefined>();

let pollTimerId: number | undefined;

const workstationOnline = computed(() => status.value === "online");

function isWorkstationOnline(workstation?: WorkstationHealth): boolean {
  return workstation?.ok === true || workstation?.status === "ok";
}

function messageId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function addMessage(role: ChatRole, content: string) {
  chatHistory.value.push({
    id: messageId(),
    role,
    content,
    createdAt: new Date().toISOString(),
  });
}

function extractReplyText(response: ChatResponse): string {
  if (typeof response.reply_text === "string") {
    return response.reply_text;
  }

  if (typeof response.reply === "string") {
    return response.reply;
  }

  if (typeof response.message === "string") {
    return response.message;
  }

  return JSON.stringify(response, null, 2);
}

function hydrateStoredChat() {
  const rawHistory = localStorage.getItem(CHAT_HISTORY_KEY);
  if (rawHistory) {
    try {
      const parsed = JSON.parse(rawHistory) as unknown;
      if (Array.isArray(parsed)) {
        chatHistory.value = parsed.filter(
          (entry): entry is ChatMessage =>
            !!entry &&
            typeof entry === "object" &&
            typeof (entry as { id?: unknown }).id === "string" &&
            typeof (entry as { role?: unknown }).role === "string" &&
            typeof (entry as { content?: unknown }).content === "string" &&
            typeof (entry as { createdAt?: unknown }).createdAt === "string",
        );
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

async function refreshStatus() {
  try {
    const data = await fetchStatus();
    status.value = isWorkstationOnline(data.workstation) ? "online" : "offline";
    uiError.value = "";
  } catch (error) {
    status.value = "unavailable";
    uiError.value =
      error instanceof Error ? error.message : "Status check could not be completed.";
  } finally {
    lastCheckedAt.value = new Date().toISOString();
  }
}

async function runPowerAction(action: PowerAction) {
  uiError.value = "";
  powerLoadingAction.value = action;

  try {
    await sendPowerAction(action);
    addMessage("system", `Power action "${action}" sent.`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Power action "${action}" failed.`;
    uiError.value = message;
    addMessage("system", message);
  } finally {
    powerLoadingAction.value = null;
    await refreshStatus();
  }
}

async function sendMessage(message: string) {
  if (!message.trim() || !workstationOnline.value || chatLoading.value) {
    return;
  }

  uiError.value = "";
  chatLoading.value = true;
  addMessage("user", message);

  try {
    const result = await sendChatMessage(message, sessionId.value);
    addMessage("assistant", extractReplyText(result));

    if (typeof result.session_id === "string") {
      sessionId.value = result.session_id;
    } else if (typeof result.sessionId === "string") {
      sessionId.value = result.sessionId;
    }
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Chat request could not be completed.";
    uiError.value = messageText;
    addMessage("system", messageText);
  } finally {
    chatLoading.value = false;
  }
}

function clearHistory() {
  chatHistory.value = [];
  sessionId.value = undefined;
}

onMounted(async () => {
  hydrateStoredChat();
  await refreshStatus();
  pollTimerId = window.setInterval(() => {
    void refreshStatus();
  }, STATUS_POLL_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (pollTimerId !== undefined) {
    clearInterval(pollTimerId);
  }
});

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
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <p class="eyebrow">JARVIS Assistant</p>
      <h1>Command Console</h1>
      <p class="subtitle">Main interaction window for workstation control and assistant chat.</p>
    </header>

    <section class="controls-grid">
      <StatusIndicator :status="status" :last-checked-at="lastCheckedAt" />
      <PowerControls
        :online="workstationOnline"
        :loading-action="powerLoadingAction"
        @run="runPowerAction"
      />
    </section>

    <p v-if="uiError" class="error-banner">Server Error: {{ uiError }}</p>

    <ChatPanel
      :messages="chatHistory"
      :disabled="!workstationOnline"
      :loading="chatLoading"
      @send="sendMessage"
      @clear-history="clearHistory"
    />
  </main>
</template>
