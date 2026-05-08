<script setup lang="ts">
defineProps<{
  isAuthenticated: boolean;
  userLabel: string;
}>();

defineEmits<{
  logout: [];
  settings: [];
}>();
</script>

<template>
  <header class="app-header">
    <p class="eyebrow">JARVIS Assistant</p>
    <h1>Command Console</h1>
    <p class="subtitle">Main interaction window for workstation control and assistant chat.</p>

    <div v-if="isAuthenticated" class="auth-bar">
      <p class="auth-copy">
        Signed in as <strong>{{ userLabel }}</strong>
      </p>
      <div class="auth-buttons">
        <button class="auth-button secondary" type="button" @click="$emit('logout')">
          Log Out
        </button>
        <button class="auth-button secondary" type="button" @click="$emit('settings')">
          Account Settings
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 14px;
  padding: 1.1rem 1.1rem 1rem;
  box-shadow: 0 0 20px var(--accent-primary-glow), inset 0 1px 0 rgba(0, 212, 255, 0.06);
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-eyebrow);
  text-shadow: 0 0 12px var(--accent-primary-glow);
}

h1 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  color: var(--color-heading);
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.08);
}

.subtitle {
  margin: 0.45rem 0 0;
  color: var(--color-subtitle);
}

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

.auth-buttons {
  display: flex;
  gap: 0.5rem;
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
