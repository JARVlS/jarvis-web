<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { ChatMessage } from "../types/jarvis";

const props = defineProps<{
  messages: ChatMessage[];
  disabled: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  send: [message: string];
  clearHistory: [];
}>();

const draft = ref("");
const historyEl = ref<HTMLElement | null>(null);

const canSend = computed(
  () => !props.disabled && !props.loading && draft.value.trim().length > 0,
);

function handleSend() {
  const message = draft.value.trim();
  if (!message || props.loading || props.disabled) {
    return;
  }

  emit("send", message);
  draft.value = "";
}

function handleClear() {
  emit("clearHistory");
}

watch(
  () =>
    props.messages
      .map((entry) => `${entry.id}:${entry.content.length}:${entry.createdAt}`)
      .join("|"),
  async () => {
    await nextTick();
    historyEl.value?.scrollTo({
      top: historyEl.value.scrollHeight,
      behavior: "smooth",
    });
  },
);
</script>

<template>
  <section class="chat-card">
    <div class="chat-header">
      <p class="section-title">Chat</p>
      <button class="history-clear" type="button" @click="handleClear" :disabled="loading">
        Clear History
      </button>
    </div>

    <div ref="historyEl" class="history" role="log" aria-live="polite" aria-label="Chat history">
      <p v-if="messages.length === 0" class="history-empty">No messages yet.</p>
      <article v-for="entry in messages" :key="entry.id" class="message" :class="`role-${entry.role}`">
        <header class="message-meta">
          <span class="message-role">{{ entry.role }}</span>
          <time>{{ new Date(entry.createdAt).toLocaleTimeString() }}</time>
        </header>
        <p class="message-body">{{ entry.content }}</p>
      </article>
    </div>

    <form class="chat-form" @submit.prevent="handleSend">
      <input
        v-model="draft"
        class="chat-input"
        type="text"
        placeholder="Type a message for JARVIS..."
        :disabled="disabled"
      />
      <button type="submit" class="send-button" :disabled="!canSend">
        {{ loading ? "Streaming..." : "Send" }}
      </button>
    </form>

    <p v-if="disabled" class="chat-hint">Chat is available only while the workstation is online.</p>
  </section>
</template>

<style scoped>
.chat-card {
  border: 1px solid var(--color-chat-border);
  border-radius: 12px;
  background: var(--color-chat-bg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: 0 0 20px var(--accent-primary-glow), inset 0 1px 0 rgba(0, 212, 255, 0.05);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-section-title);
}

.history-clear {
  border: 1px solid var(--color-chat-clear-border);
  background: var(--color-chat-clear-bg);
  color: var(--color-chat-clear-text);
  border-radius: 8px;
  padding: 0.45rem 0.7rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
}

.history-clear:not(:disabled):hover {
  border-color: var(--accent-complement-dim);
  color: var(--accent-complement);
  box-shadow: 0 0 8px var(--accent-complement-glow);
}

.history-clear:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.history {
  border: 1px solid var(--color-chat-history-border);
  border-radius: 10px;
  min-height: 200px;
  max-height: 360px;
  overflow-y: auto;
  padding: 0.75rem;
  background: linear-gradient(180deg, var(--color-chat-history-bg-start) 0%, var(--color-chat-history-bg-end) 100%);
}

.history-empty {
  margin: 0;
  color: var(--color-chat-empty);
}

.message {
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  margin-bottom: 0.55rem;
}

.message:last-child {
  margin-bottom: 0;
}

.role-user {
  background: var(--color-chat-msg-user-bg);
  border: 1px solid var(--color-chat-msg-user-border);
  box-shadow: inset 2px 0 0 var(--accent-primary-dim);
}

.role-assistant {
  background: var(--color-chat-msg-assistant-bg);
  border: 1px solid var(--color-chat-msg-assistant-border);
  box-shadow: inset 2px 0 0 #10804a;
}

.role-system {
  background: var(--color-chat-msg-system-bg);
  border: 1px solid var(--color-chat-msg-system-border);
  box-shadow: inset 2px 0 0 var(--accent-complement-dim);
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
  font-size: 0.76rem;
  text-transform: capitalize;
  color: var(--color-chat-meta);
}

.message-body {
  margin: 0;
  white-space: pre-wrap;
  color: var(--color-chat-body);
}

.chat-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem;
}

.chat-input {
  border: 1px solid var(--color-chat-input-border);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font-size: 0.97rem;
  background: var(--color-chat-input-bg);
  color: var(--color-chat-input-text);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.chat-input:focus {
  outline: none;
  border-color: var(--accent-primary-dim);
  box-shadow: 0 0 10px var(--accent-primary-glow);
}

.chat-input:disabled {
  background: var(--color-chat-input-disabled-bg);
  cursor: not-allowed;
}

.send-button {
  border: none;
  border-radius: 10px;
  background: var(--color-chat-send-bg);
  color: var(--color-chat-send-text);
  padding: 0.65rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 150ms ease, transform 120ms ease;
}

.send-button:not(:disabled):hover {
  box-shadow: 0 0 14px var(--accent-primary-glow), 0 2px 8px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-hint {
  margin: 0;
  color: var(--color-chat-hint);
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .chat-form {
    grid-template-columns: 1fr;
  }
}
</style>
