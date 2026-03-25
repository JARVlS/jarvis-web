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
  issued_at: number;
  expires_at: number;
  principal: {
    local_app_user_id: string;
    oidc_sub: string;
    email: string;
    display_name: string | null;
    roles: string[];
    scopes: string[];
  };
  session: {
    backend_session_id: string;
  };
  conversation: {
    conversation_id: string;
  };
  authorization: {
    allowed_tool_names: string[];
  };
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
  conversationId: string | undefined,
  backendSessionId: string,
): TrustedChatPayload {
  const now = Math.floor(Date.now() / 1000);
  const resolvedConversationId = conversationId?.trim() || crypto.randomUUID();
  const availableTools = getAvailableToolsForScopes(userContext.scopes);

  return {
    request_id: crypto.randomUUID(),
    message,
    issued_at: now,
    expires_at: now + TRUSTED_REQUEST_TTL_SECONDS,

    principal: {
      local_app_user_id: String(userContext.user_id),
      oidc_sub: userContext.oidc_sub,
      email: userContext.email,
      display_name: userContext.display_name,
      roles: userContext.roles,
      scopes: userContext.scopes,
    },

    session: {
      backend_session_id: backendSessionId,
    },

    conversation: {
      conversation_id: resolvedConversationId,
    },

    authorization: {
      allowed_tool_names: availableTools.map((tool) => tool.name),
    },
  };
}

function signTrustedPayload(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export async function sendChat(
  message: string,
  userContext: UserContext,
  conversationId: string | undefined,
  backendSessionId: string,
) {
  const payload = buildTrustedChatPayload(
    message,
    userContext,
    conversationId,
    backendSessionId,
  );

  const rawBody = JSON.stringify(payload);

  const signature = crypto
    .createHmac("sha256", process.env.JARVIS_TRUSTED_BACKEND_SECRET!)
    .update(rawBody)
    .digest("hex");

  const response = await fetch(`${WORKSTATION_JARVIS_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Jarvis-Key-Id": process.env.JARVIS_TRUSTED_BACKEND_KEY_ID!,
      "X-Jarvis-Signature": signature,
    },
    body: rawBody,
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("Jarvis trusted request failed", {
      url: `${WORKSTATION_JARVIS_URL}/chat`,
      status: response.status,
      status_text: response.statusText,
      response_body: text,
    });
    throw new Error(`Workstation chat failed: ${response.status}`);
  }

  return JSON.parse(text);
}

export async function getWorkstationHealth() {
  const response = await fetch(`${WORKSTATION_JARVIS_URL}/health`);
  if (!response.ok) {
    throw new Error(`Workstation health failed: ${response.status}`);
  }
  return response.json();
}
