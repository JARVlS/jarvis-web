<script setup lang="ts">
defineProps<{
  loading: boolean;
  error: string;
}>();

defineEmits<{
  login: [];
}>();
</script>

<template>
  <section class="auth-card">
    <p class="section-title">Authentication</p>

    <template v-if="loading">
      <p class="auth-description">Checking your Jarvis session...</p>
    </template>

    <template v-else>
      <p class="auth-description">
        Sign in with Authentik to unlock assistant chat and workstation controls.
      </p>
      <button class="auth-button" type="button" @click="$emit('login')">Sign In</button>
      <p v-if="error" class="error-banner">Auth Error: {{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.auth-card {
  border: 1px solid var(--color-status-card-border);
  border-radius: 12px;
  background: var(--color-status-card-bg);
  padding: 1rem;
  box-shadow: 0 0 16px var(--accent-primary-glow), inset 0 1px 0 rgba(0, 212, 255, 0.04);
}

.section-title {
  margin: 0 0 0.75rem;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-section-title);
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

.error-banner {
  margin: 1rem 0 0;
  border: 1px solid var(--color-error-border);
  background: var(--color-error-bg);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  color: var(--color-error-text);
  box-shadow: 0 0 12px rgba(255, 80, 80, 0.1);
}
</style>
