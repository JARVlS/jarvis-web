const WORKSTATION_URL = process.env.WORKSTATION_URL || "http://jarvis:8000";

export async function sendChat(message: string, sessionId?: string) {
  const response = await fetch(`${WORKSTATION_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Workstation chat failed: ${response.status}`);
  }

  return response.json();
}

export async function getWorkstationHealth() {
  const response = await fetch(`${WORKSTATION_URL}/health`);
  if (!response.ok) {
    throw new Error(`Workstation health failed: ${response.status}`);
  }
  return response.json();
}