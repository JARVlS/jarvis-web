<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiUrl } from "./config/api";

const message = ref("");
const output = ref("");
const loading = ref(false);
const status = ref("Checking...");

async function fetchStatus() {
  try {
    const res = await fetch(apiUrl("/status"));
    const data = await res.json();

    if (data.workstation?.status === "ok" || data.workstation?.ok) {
      status.value = "Online";
    } else {
      status.value = "Offline";
    }
  } catch {
    status.value = "Unavailable";
  }
}

async function sendMessage() {
  if (!message.value.trim()) return;

  loading.value = true;
  output.value = "";

  try {
    const res = await fetch(apiUrl("/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message.value }),
    });

    const data = await res.json();
    output.value = data.reply_text ?? JSON.stringify(data, null, 2);
  } catch {
    output.value = "Chat request failed.";
  } finally {
    loading.value = false;
  }
}

async function powerAction(action: "wake" | "sleep" | "shutdown") {
  try {
    await fetch(apiUrl(`/power/${action}`), {
      method: "POST",
    });
    await fetchStatus();
  } catch {
    output.value = `Power action "${action}" failed.`;
  }
}

onMounted(fetchStatus);
</script>

<template>
  <main style="max-width: 900px; margin: 0 auto; padding: 2rem;">
    <h1>Jarvis Control</h1>
    <p>Status: {{ status }}</p>

    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
      <button @click="powerAction('wake')">Wake</button>
      <button @click="powerAction('sleep')">Sleep</button>
      <button @click="powerAction('shutdown')">Shutdown</button>
    </div>

    <div style="display: flex; gap: 0.5rem;">
      <input
        v-model="message"
        type="text"
        placeholder="Type a message..."
        style="flex: 1; padding: 0.5rem;"
      />
      <button @click="sendMessage" :disabled="loading">
        {{ loading ? "Sending..." : "Send" }}
      </button>
    </div>

    <pre style="margin-top: 1rem; white-space: pre-wrap;">{{ output }}</pre>
  </main>
</template>
