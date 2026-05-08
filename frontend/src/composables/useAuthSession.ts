import { computed, ref } from "vue";
import { fetchCurrentUser, logout } from "../services/jarvisApi";
import type { CurrentUser } from "../types/jarvis";

const ACCOUNT_SETTINGS_URL = "https://auth.jarvis.leongrass.ch/";

export function useAuthSession() {
  const authLoading = ref(true);
  const authError = ref("");
  const currentUser = ref<CurrentUser | null>(null);

  const isAuthenticated = computed(() => currentUser.value !== null);
  const userLabel = computed(
    () => currentUser.value?.display_name || currentUser.value?.email || "Jarvis User",
  );

  function handleAuthFailure(message = "Your session has expired. Please sign in again.") {
    currentUser.value = null;
    authError.value = message;
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

  async function initialize() {
    await refreshCurrentUser();
    return currentUser.value !== null;
  }

  async function handleLogout() {
    try {
      await logout();
      currentUser.value = null;
      authError.value = "";
    } catch (error) {
      authError.value = error instanceof Error ? error.message : "Logout failed.";
    }
  }

  function handleSettings() {
    window.open(ACCOUNT_SETTINGS_URL, "_blank");
  }

  return {
    authError,
    authLoading,
    currentUser,
    handleAuthFailure,
    handleLogout,
    handleSettings,
    initialize,
    isAuthenticated,
    refreshCurrentUser,
    userLabel,
  };
}
