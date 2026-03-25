import type { UserContext } from "../auth/types.js";
import { WORKSTATION_JARVIS_URL } from "../env.js";
import { getAvailableToolsForScopes } from "../tools/registry.js";
import crypto from "node:crypto";

const TRUSTED_REQUEST_TTL_SECONDS = 60;

interface TrustedPrincipalPayload {
  local_app_user_id: number;
  oidc_sub: string;
  email: string;
  display_name: string | null;
  roles: string[];
  scopes: string[];
}

interface TrustedSessionPayload {
  backend_session_id: string;
}

interface TrustedChatPayload {
  request_id: string;
  message: string;
  conversation_id: string;
  issued_at: number;
  expires_at: number;
  principal: TrustedPrincipalPayload;
  session: TrustedSessionPayload;
  allowed_tool_names: string[];
}

function getTrustedBackendConfig() {
  const keyId = process.env.JARVIS_TRUSTED_BACKEND_KEY_ID;
  const secret = process.env.JARVIS_TRUSTED_BACKEND_SECRET;

  if (!keyId) {
    throw new Error("JARVIS_TRUSTED_BACKEND_KEY_ID is not configured");
  }

  if (!secret) {
    throw new Error("JARVIS_TRUSTED_BACKEND_SECRET is not configured");
  }

  return { keyId, secret };
}

function buildTrustedChatPayload(
  message: string,
  userContext: UserContext,
  conversationId?: string,
): TrustedChatPayload {
  const now = Math.floor(Date.now() / 1000);
  const resolvedConversationId = conversationId?.trim() || crypto.randomUUID();
  const availableTools = getAvailableToolsForScopes(userContext.scopes);

  return {
    request_id: crypto.randomUUID(),
    message,
    conversation_id: resolvedConversationId,
    issued_at: now,
    expires_at: now + TRUSTED_REQUEST_TTL_SECONDS,
    principal: {
      local_app_user_id: userContext.user_id,
      oidc_sub: userContext.oidc_sub,
      email: userContext.email,
      display_name: userContext.display_name,
      roles: userContext.roles,
      scopes: userContext.scopes,
    },
    session: {
      backend_session_id: resolvedConversationId,
    },
    allowed_tool_names: availableTools.map((tool) => tool.name),
  };
}

function signTrustedPayload(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export async function sendChat(
  message: string,
  userContext: UserContext,
  conversationId?: string,
) {
  const { keyId, secret } = getTrustedBackendConfig();
  const payload = buildTrustedChatPayload(message, userContext, conversationId);
  const rawBody = JSON.stringify(payload);
  const signature = signTrustedPayload(rawBody, secret);
  const url = `${WORKSTATION_JARVIS_URL}/chat`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Jarvis-Key-Id": keyId,
        "X-Jarvis-Signature": signature,
      },
      body: rawBody,
    });
  } catch (error) {
    console.error("Jarvis trusted request failed before response", {
      url,
      request_id: payload.request_id,
      conversation_id: payload.conversation_id,
      backend_session_id: payload.session.backend_session_id,
      allowed_tool_names: payload.allowed_tool_names,
      error,
    });
    throw error;
  }

  const responseText = await response.text();

  if (!response.ok) {
    console.error("Jarvis trusted request failed", {
      url,
      status: response.status,
      status_text: response.statusText,
      request_id: payload.request_id,
      conversation_id: payload.conversation_id,
      backend_session_id: payload.session.backend_session_id,
      allowed_tool_names: payload.allowed_tool_names,
      response_body: responseText,
    });
    throw new Error(`Workstation chat failed: ${response.status}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Jarvis trusted request returned invalid JSON", {
      url,
      request_id: payload.request_id,
      conversation_id: payload.conversation_id,
      response_body: responseText,
      error,
    });
    throw new Error("Workstation chat returned invalid JSON");
  }
}

export async function getWorkstationHealth() {
  const response = await fetch(`${WORKSTATION_JARVIS_URL}/health`);
  if (!response.ok) {
    throw new Error(`Workstation health failed: ${response.status}`);
  }
  return response.json();
}
