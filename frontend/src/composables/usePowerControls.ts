import { ref } from "vue";
import { sendPowerAction } from "../services/jarvisApi";
import type { PowerAction } from "../types/jarvis";

interface UsePowerControlsOptions {
  addSystemMessage: (content: string) => void;
  onAuthFailure: (message?: string) => void;
  onStatusRefresh: () => Promise<void>;
  onUiClear: () => void;
  onUiError: (message: string) => void;
}

export function usePowerControls(options: UsePowerControlsOptions) {
  const powerLoadingAction = ref<PowerAction | null>(null);

  async function runPowerAction(action: PowerAction) {
    options.onUiClear();
    powerLoadingAction.value = action;
    let shouldRefreshStatus = true;

    try {
      await sendPowerAction(action);
      options.addSystemMessage(`Power action "${action}" sent.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Power action "${action}" failed.`;
      if (message.includes("Authentication required")) {
        shouldRefreshStatus = false;
        options.onAuthFailure(message);
        return;
      }

      options.onUiError(message);
      options.addSystemMessage(message);
    } finally {
      powerLoadingAction.value = null;
      if (shouldRefreshStatus) {
        await options.onStatusRefresh();
      }
    }
  }

  return {
    powerLoadingAction,
    runPowerAction,
  };
}
