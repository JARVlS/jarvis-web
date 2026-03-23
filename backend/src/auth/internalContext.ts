import { createHmac } from "node:crypto";
import { INTERNAL_JARVIS_SHARED_SECRET } from "../env.js";
import type { UserContext } from "./types.js";

const INTERNAL_CONTEXT_TTL_SECONDS = 60;

export function buildInternalJarvisHeaders(userContext: UserContext) {
  const payload = {
    user_id: userContext.user_id,
    roles: userContext.roles,
    scopes: userContext.scopes,
    private_rag_namespace: userContext.private_rag_namespace,
    shared_rag_namespaces: userContext.shared_rag_namespaces,
    exp: Math.floor(Date.now() / 1_000) + INTERNAL_CONTEXT_TTL_SECONDS,
  };

  const encodedContext = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", INTERNAL_JARVIS_SHARED_SECRET)
    .update(encodedContext)
    .digest("base64url");

  return {
    "X-Jarvis-Context": encodedContext,
    "X-Jarvis-Signature": signature,
  };
}
