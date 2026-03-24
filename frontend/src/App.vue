<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ChatPanel from "./components/ChatPanel.vue";
import PowerControls from "./components/PowerControls.vue";
import StatusIndicator from "./components/StatusIndicator.vue";
import {
  beginLogin,
  fetchCurrentUser,
  fetchStatus,
  logout,
  sendChatMessage,
  sendPowerAction,
} from "./services/jarvisApi";
import type {
  ChatMessage,
  ChatResponse,
  ChatRole,
  CurrentUser,
  PowerAction,
  WorkstationHealth,
  WorkstationStatusState,
} from "./types/jarvis";

const STATUS_POLL_INTERVAL_MS = 8_000;
const CHAT_HISTORY_KEY = "jarvis.chatHistory.v1";
const CHAT_SESSION_KEY = "jarvis.chatSession.v1";

const status = ref<WorkstationStatusState>("checking");
const lastCheckedAt = ref<string | null>(null);
const authLoading = ref(true);
const chatLoading = ref(false);
const powerLoadingAction = ref<PowerAction | null>(null);
const authError = ref("");
const uiError = ref<string>("");
const chatHistory = ref<ChatMessage[]>([]);
const currentUser = ref<CurrentUser | null>(null);
const sessionId = ref<string | undefined>();

let pollTimerId: number | undefined;

const workstationOnline = computed(() => status.value === "online");
const isAuthenticated = computed(() => currentUser.value !== null);
const userLabel = computed(
  () => currentUser.value?.display_name || currentUser.value?.email || "Jarvis User",
);

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

function clearPollTimer() {
  if (pollTimerId !== undefined) {
    clearInterval(pollTimerId);
    pollTimerId = undefined;
  }
}

function clearHistory() {
  chatHistory.value = [];
  sessionId.value = undefined;
}

function resetAppState() {
  clearPollTimer();
  clearHistory();
  status.value = "checking";
  lastCheckedAt.value = null;
}

function handleAuthFailure(message = "Your session has expired. Please sign in again.") {
  currentUser.value = null;
  authError.value = message;
  resetAppState();
}

async function refreshCurrentUser() {
  authLoading.value = true;

  try {
    const result = await fetchCurrentUser();
    currentUser.value = result?.user ?? null;
    authError.value = "";
  } catch (error) {
    currentUser.value = null;
    authError.value =
      error instanceof Error ? error.message : "User session could not be loaded.";
  } finally {
    authLoading.value = false;
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
    if (message.includes("Authentication required")) {
      handleAuthFailure();
      return;
    }

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
    if (messageText.includes("Authentication required")) {
      handleAuthFailure();
      return;
    }

    uiError.value = messageText;
    addMessage("system", messageText);
  } finally {
    chatLoading.value = false;
  }
}

async function handleLogout() {
  try {
    await logout();
    currentUser.value = null;
    authError.value = "";
    resetAppState();
  } catch (error) {
    authError.value = error instanceof Error ? error.message : "Logout failed.";
  }
}

async function handleSettings() {
  window.open("https://auth.jarvis.leongrass.ch/", "_blank");
}

onMounted(async () => {
  await refreshCurrentUser();

  if (currentUser.value) {
    hydrateStoredChat();
    await refreshStatus();
    pollTimerId = window.setInterval(() => {
      void refreshStatus();
    }, STATUS_POLL_INTERVAL_MS);
  }
});

onBeforeUnmount(() => {
  clearPollTimer();
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

      <div v-if="isAuthenticated" class="auth-bar">
        <p class="auth-copy">
          Signed in as <strong>{{ userLabel }}</strong>
        </p>
        <div class="auth-buttons">
          <button class="auth-button secondary" type="button" @click="handleLogout">
            Log Out
          </button>
          <button class="auth-button secondary" type="button" @click="handleSettings">
            Account Settings
          </button>
        </div>
      </div>
    </header>

    <section v-if="authLoading" class="auth-card">
      <p class="section-title">Authentication</p>
      <p class="auth-description">Checking your Jarvis session...</p>
    </section>

    <section v-else-if="!isAuthenticated" class="auth-card">
      <p class="section-title">Authentication</p>
      <p class="auth-description">
        Sign in with Authentik to unlock assistant chat and workstation controls.
      </p>
      <button class="auth-button" type="button" @click="beginLogin">Sign In</button>
      <p v-if="authError" class="error-banner">Auth Error: {{ authError }}</p>
    </section>

    <template v-else>
      <section class="controls-grid">
        <StatusIndicator :status="status" :last-checked-at="lastCheckedAt" />
        <PowerControls
          :online="workstationOnline"
          :loading-action="powerLoadingAction"
          @run="runPowerAction"
        />
      </section>

      <p v-if="uiError" class="error-banner">Server Error: {{ uiError }}</p>
      <p v-if="authError" class="error-banner">Auth Error: {{ authError }}</p>

      <ChatPanel
        :messages="chatHistory"
        :disabled="!workstationOnline"
        :loading="chatLoading"
        @send="sendMessage"
        @clear-history="clearHistory"
      />
    </template>
  </main>
</template>

<style scoped>
.auth-bar {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.auth-copy {
  margin: 0;
  color: var(--color-status-text);
}

.auth-card {
  border: 1px solid var(--color-status-card-border);
  border-radius: 12px;
  background: var(--color-status-card-bg);
  padding: 1rem;
  box-shadow: 0 0 16px var(--accent-primary-glow), inset 0 1px 0 rgba(0, 212, 255, 0.04);
}

.auth-description {
  margin: 0 0 1rem;
  color: var(--color-status-meta);
}

.auth-button {
  border: none;
  border-radius: 10px;
  background: var(--color-chat-send-bg);
  color: var(--color-chat-send-text);
  padding: 0.7rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.auth-button.secondary {
  background: transparent;
  border: 1px solid var(--color-chat-clear-border);
  color: var(--color-chat-clear-text);
}

.auth-buttons{
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .auth-bar {
    align-items: stretch;
  }

  .auth-button.secondary {
    width: 100%;
  }
  .auth-buttons {
    flex-direction: column;
  }
}
</style>
