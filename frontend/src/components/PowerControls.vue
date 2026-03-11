<script setup lang="ts">
import { computed } from "vue";
import type { PowerAction } from "../types/jarvis";

const props = defineProps<{
  online: boolean;
  loadingAction: PowerAction | null;
}>();

const emit = defineEmits<{
  run: [action: PowerAction];
}>();

const visibleActions = computed<PowerAction[]>(() =>
  props.online ? ["sleep", "shutdown"] : ["wake"],
);

const labels: Record<PowerAction, string> = {
  wake: "Wake",
  sleep: "Sleep",
  shutdown: "Shutdown",
};

function handleClick(action: PowerAction) {
  emit("run", action);
}
</script>

<template>
  <section class="power-card">
    <p class="section-title">Workstation Power</p>
    <div class="button-grid">
      <button
        v-for="action in visibleActions"
        :key="action"
        class="power-button"
        :class="`power-${action}`"
        :disabled="loadingAction !== null"
        @click="handleClick(action)"
      >
        {{ loadingAction === action ? `${labels[action]}...` : labels[action] }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.power-card {
  border: 1px solid var(--color-power-card-border);
  border-radius: 12px;
  background: var(--color-power-card-bg);
  padding: 1rem;
  box-shadow: 0 0 16px var(--accent-complement-glow), inset 0 1px 0 rgba(255, 159, 28, 0.04);
}

.section-title {
  margin: 0 0 0.75rem;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-section-title);
}

.button-grid {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.power-button {
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease;
  text-shadow: 0 0 10px currentColor;
}

.power-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.power-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.power-wake {
  background: var(--color-power-wake-bg);
  color: var(--color-power-wake-text);
  box-shadow: inset 0 0 0 1px var(--color-power-wake-border);
}

.power-wake:not(:disabled):hover {
  box-shadow: inset 0 0 0 1px var(--color-power-wake-border), 0 0 14px rgba(0, 255, 136, 0.2);
}

.power-sleep {
  background: var(--color-power-sleep-bg);
  color: var(--color-power-sleep-text);
  box-shadow: inset 0 0 0 1px var(--color-power-sleep-border);
}

.power-sleep:not(:disabled):hover {
  box-shadow: inset 0 0 0 1px var(--color-power-sleep-border), 0 0 14px var(--accent-complement-glow);
}

.power-shutdown {
  background: var(--color-power-shutdown-bg);
  color: var(--color-power-shutdown-text);
  box-shadow: inset 0 0 0 1px var(--color-power-shutdown-border);
}

.power-shutdown:not(:disabled):hover {
  box-shadow: inset 0 0 0 1px var(--color-power-shutdown-border), 0 0 14px rgba(255, 80, 80, 0.2);
}
</style>
