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


function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function buildSigningInput(params: {
  method: string
  path: string
  contentType: string
  bodySha256: string
}): string {
  // This is the most likely contract based on your Python verifier.
  // If your Python helper uses a different separator/order, match that exactly.
  return [
    params.method.toUpperCase(),
    params.path,
    params.contentType,
    params.bodySha256,
  ].join("\n")
}

function signTrustedRequest(params: {
  secret: string
  method: string
  path: string
  contentType: string
  rawBody: string
}): string {
  const bodySha256 = sha256Hex(params.rawBody)

  const signingInput = buildSigningInput({
    method: params.method,
    path: params.path,
    contentType: params.contentType,
    bodySha256,
  })

  const digest = crypto
    .createHmac("sha256", params.secret)
    .update(signingInput, "utf8")
    .digest()

  return toBase64Url(digest)
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
  )

  const rawBody = JSON.stringify(payload)
  const method = "POST"
  const path = "/chat"
  const contentType = "application/json"

  const signature = signTrustedRequest({
    secret: process.env.JARVIS_TRUSTED_BACKEND_SECRET!,
    method,
    path,
    contentType,
    rawBody,
  })

  const response = await fetch(`${WORKSTATION_JARVIS_URL}/chat`, {
    method,
    headers: {
      "Content-Type": contentType,
      "X-Jarvis-Key-Id": process.env.JARVIS_TRUSTED_BACKEND_KEY_ID!,
      "X-Jarvis-Signature": signature,
    },
    body: rawBody,
  })

  const text = await response.text()

  if (!response.ok) {
    console.error("Jarvis trusted request failed", {
      url: `${WORKSTATION_JARVIS_URL}/chat`,
      status: response.status,
      status_text: response.statusText,
      response_body: text,
    })
    throw new Error(`Workstation chat failed: ${response.status}`)
  }

  return JSON.parse(text)
}

export async function getWorkstationHealth() {
  const response = await fetch(`${WORKSTATION_JARVIS_URL}/health`);
  if (!response.ok) {
    throw new Error(`Workstation health failed: ${response.status}`);
  }
  return response.json();
}
