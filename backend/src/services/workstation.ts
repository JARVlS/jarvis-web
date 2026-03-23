import { buildInternalJarvisHeaders } from "../auth/internalContext.js";
import type { UserContext } from "../auth/types.js";
import { WORKSTATION_JARVIS_URL } from "../env.js";
import { getAvailableToolsForScopes } from "../tools/registry.js";

console.log(`Using workstation URL: ${WORKSTATION_JARVIS_URL}`);

export async function sendChat(
  message: string,
  userContext: UserContext,
  sessionId?: string,
) {
  const availableTools = getAvailableToolsForScopes(userContext.scopes);

  const response = await fetch(`${WORKSTATION_JARVIS_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Jarvis-Tools": Buffer.from(JSON.stringify(availableTools)).toString("base64url"),
      ...buildInternalJarvisHeaders(userContext),
    },
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
  const response = await fetch(`${WORKSTATION_JARVIS_URL}/health`);
  if (!response.ok) {
    throw new Error(`Workstation health failed: ${response.status}`);
  }
  return response.json();
}
