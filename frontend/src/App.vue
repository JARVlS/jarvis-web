<script setup lang="ts">
import { onMounted } from "vue";
import AppHeader from "./components/AppHeader.vue";
import AuthCard from "./components/AuthCard.vue";
import ChatPanel from "./components/ChatPanel.vue";
import ErrorBanner from "./components/ErrorBanner.vue";
import PowerControls from "./components/PowerControls.vue";
import StatusIndicator from "./components/StatusIndicator.vue";
import { useAuthSession } from "./composables/useAuthSession";
import { useJarvisChat } from "./composables/useJarvisChat";
import { usePowerControls } from "./composables/usePowerControls";
import { useWorkstationStatus } from "./composables/useWorkstationStatus";
import { beginLogin } from "./services/jarvisApi";

const auth = useAuthSession();
const workstation = useWorkstationStatus();

function resetAuthenticatedState() {
  workstation.reset();
  chat.reset();
}

function handleAuthFailure(message?: string) {
  auth.handleAuthFailure(message);
  resetAuthenticatedState();
}

const chat = useJarvisChat({
  isWorkstationOnline: workstation.workstationOnline,
  onAuthFailure: handleAuthFailure,
  onUiClear: workstation.clearUiError,
  onUiError: workstation.setUiError,
});

const power = usePowerControls({
  addSystemMessage: chat.addSystemMessage,
  onAuthFailure: handleAuthFailure,
  onStatusRefresh: workstation.refreshStatus,
  onUiClear: workstation.clearUiError,
  onUiError: workstation.setUiError,
});

async function initializeApp() {
  const authenticated = await auth.initialize();
  if (!authenticated) {
    resetAuthenticatedState();
    return;
  }

  chat.hydrateStoredChat();
  await workstation.startPolling();
}

async function handleLogout() {
  await auth.handleLogout();
  resetAuthenticatedState();
}

onMounted(() => {
  void initializeApp();
});
</script>

<template>
  <main class="app-shell">
    <AppHeader
      :is-authenticated="auth.isAuthenticated.value"
      :user-label="auth.userLabel.value"
      @logout="handleLogout"
      @settings="auth.handleSettings"
    />

    <AuthCard
      v-if="auth.authLoading.value || !auth.isAuthenticated.value"
      :loading="auth.authLoading.value"
      :error="auth.authError.value"
      @login="beginLogin"
    />

    <template v-else>
      <section class="controls-grid">
        <StatusIndicator
          :status="workstation.status.value"
          :last-checked-at="workstation.lastCheckedAt.value"
        />
        <PowerControls
          :online="workstation.workstationOnline.value"
          :loading-action="power.powerLoadingAction.value"
          @run="power.runPowerAction"
        />
      </section>

      <ErrorBanner v-if="workstation.uiError.value" label="Server Error">
        {{ workstation.uiError.value }}
      </ErrorBanner>
      <ErrorBanner v-if="auth.authError.value" label="Auth Error">
        {{ auth.authError.value }}
      </ErrorBanner>

      <ChatPanel
        :messages="chat.messages.value"
        :disabled="!workstation.workstationOnline.value"
        :loading="chat.chatLoading.value"
        @send="chat.sendMessage"
        @clear-history="chat.clearHistory"
      />
    </template>
  </main>
</template>
