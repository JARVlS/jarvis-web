import { computed, onBeforeUnmount, ref } from "vue";
import { fetchStatus } from "../services/jarvisApi";
import type { WorkstationHealth, WorkstationStatusState } from "../types/jarvis";

const STATUS_POLL_INTERVAL_MS = 8_000;

function isWorkstationOnline(workstation?: WorkstationHealth): boolean {
  return workstation?.ok === true || workstation?.status === "ok";
}

export function useWorkstationStatus() {
  const status = ref<WorkstationStatusState>("checking");
  const lastCheckedAt = ref<string | null>(null);
  const uiError = ref("");
  const workstationOnline = computed(() => status.value === "online");

  let pollTimerId: number | undefined;

  function clearPollTimer() {
    if (pollTimerId !== undefined) {
      clearInterval(pollTimerId);
      pollTimerId = undefined;
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

  async function startPolling() {
    clearPollTimer();
    await refreshStatus();
    pollTimerId = window.setInterval(() => {
      void refreshStatus();
    }, STATUS_POLL_INTERVAL_MS);
  }

  function setUiError(message: string) {
    uiError.value = message;
  }

  function clearUiError() {
    uiError.value = "";
  }

  function reset() {
    clearPollTimer();
    status.value = "checking";
    lastCheckedAt.value = null;
    uiError.value = "";
  }

  onBeforeUnmount(() => {
    clearPollTimer();
  });

  return {
    clearUiError,
    lastCheckedAt,
    refreshStatus,
    reset,
    setUiError,
    startPolling,
    status,
    uiError,
    workstationOnline,
  };
}
