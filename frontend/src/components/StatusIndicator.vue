<script setup lang="ts">
import { computed } from "vue";
import type { WorkstationStatusState } from "../types/jarvis";

const props = defineProps<{
  status: WorkstationStatusState;
  lastCheckedAt: string | null;
}>();

const statusLabel = computed(() => {
  switch (props.status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    case "unavailable":
      return "Unavailable";
    case "checking":
    default:
      return "Checking";
  }
});

const checkedLabel = computed(() => {
  if (!props.lastCheckedAt) {
    return "Not checked yet";
  }

  const date = new Date(props.lastCheckedAt);
  return `Last checked ${date.toLocaleTimeString()}`;
});
</script>

<template>
  <section class="status-card">
    <div class="status-row">
      <span class="status-dot" :class="`is-${status}`" aria-hidden="true"></span>
      <p class="status-text">Workstation {{ statusLabel }}</p>
    </div>
    <p class="status-meta">{{ checkedLabel }}</p>
  </section>
</template>

<style scoped>
.status-card {
  border: 1px solid var(--color-status-card-border);
  border-radius: 12px;
  background: var(--color-status-card-bg);
  padding: 0.9rem 1rem;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  display: inline-block;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 20%, transparent);
}

.status-dot.is-online {
  color: var(--color-status-online);
  background: var(--color-status-online);
}

.status-dot.is-offline,
.status-dot.is-unavailable {
  color: var(--color-status-offline);
  background: var(--color-status-offline);
}

.status-dot.is-checking {
  color: var(--color-status-checking);
  background: var(--color-status-checking);
}

.status-text {
  margin: 0;
  font-weight: 600;
  color: var(--color-status-text);
}

.status-meta {
  margin: 0.3rem 0 0;
  font-size: 0.86rem;
  color: var(--color-status-meta);
}
</style>
