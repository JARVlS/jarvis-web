import type { UserContext } from "../auth/types.js";
import { WORKSTATION_JARVIS_URL, JARVIS_TRUSTED_BACKEND_SECRET } from "../env.js";

export type JarvisChatPayload = {
  message: string
  user_id: string
  session_id: string
  conversation_id: string
  allowed_tool_names: string[] | null
}

function buildUserId(userContext: UserContext): string {
  return userContext.user_id?.toString() ?? userContext.oidc_sub ?? userContext.email;
}

export function buildJarvisChatPayload(
  message: string,
  userContext: UserContext,
  backendSessionId: string,
  conversationId: string | undefined
): JarvisChatPayload {
  return {
    message,
    user_id: buildUserId(userContext),
    session_id: backendSessionId,
    conversation_id: conversationId ?? backendSessionId,
    allowed_tool_names: null,
  };
}

export async function sendChat(
  message: string,
  userContext: UserContext,
  conversationId: string | undefined,
  backendSessionId: string,
) {
  const payload = {
    message,
    user_id: buildUserId(userContext),
    session_id: backendSessionId,
    conversation_id: conversationId ?? backendSessionId,
    allowed_tool_names: ["time"],
  }

  const response = await fetch(`${WORKSTATION_JARVIS_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${JARVIS_TRUSTED_BACKEND_SECRET}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Jarvis backend failed: ${response.status} ${text}`)
  }

  return response.json()
}

export async function streamChatFromWorkstation(
  payload: JarvisChatPayload): Promise<Response> {
    const workstationUrl = `${WORKSTATION_JARVIS_URL}/chat/stream`;
    const internalToken = JARVIS_TRUSTED_BACKEND_SECRET;

    const response = await fetch(workstationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${internalToken}`,
      },
      body: JSON.stringify(payload),
    });

    return response;
  }

export async function getWorkstationHealth() {
  const response = await fetch(`${WORKSTATION_JARVIS_URL}/health`);
  if (!response.ok) {
    throw new Error(`Workstation health failed: ${response.status}`);
  }
  return response.json();
}
