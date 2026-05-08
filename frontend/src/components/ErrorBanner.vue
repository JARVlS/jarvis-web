<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <p class="error-banner">{{ label }}: <slot /></p>
</template>

<style scoped>
.error-banner {
  margin: 0;
  border: 1px solid var(--color-error-border);
  background: var(--color-error-bg);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  color: var(--color-error-text);
  box-shadow: 0 0 12px rgba(255, 80, 80, 0.1);
}
</style>
