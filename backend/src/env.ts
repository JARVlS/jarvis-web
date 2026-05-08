import dotenv from "dotenv";
dotenv.config();

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function readUrlEnv(name: string, fallback: string) {
  return normalizeUrl(process.env[name] || fallback);
}

function readStringEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const PORT = Number(process.env.PORT || 8000);
export const HOST = process.env.HOST || "0.0.0.0";
export const WORKSTATION_JARVIS_URL = readUrlEnv(
  "WORKSTATION_JARVIS_URL",
  process.env.WORKSTATION_URL || "http://jarvis:8000",
);
export const PI_URL = readUrlEnv("PI_URL", "http://jarvis-pi:5000");
export const PI_API_TOKEN = readStringEnv("PI_API_TOKEN", "replace-me --- IGNORE ---");

export const OIDC_ISSUER = readUrlEnv(
  "OIDC_ISSUER",
  "https://auth.jarvis.leongrass.ch/application/o/jarvis",
);
export const OIDC_CLIENT_ID = readStringEnv("OIDC_CLIENT_ID", "jarvis-web");
export const OIDC_CLIENT_SECRET = readStringEnv("OIDC_CLIENT_SECRET", "replace-me");
export const OIDC_REDIRECT_URI = readUrlEnv(
  "OIDC_REDIRECT_URI",
  "http://localhost:8000/auth/callback",
);
export const SESSION_SECRET = readStringEnv("SESSION_SECRET", "replace-me");
export const FRONTEND_URL = readUrlEnv("FRONTEND_URL", "http://localhost:3000");
export const INTERNAL_JARVIS_SHARED_SECRET = readStringEnv(
  "INTERNAL_JARVIS_SHARED_SECRET",
  "replace-me",
);

export const SESSION_COOKIE_NAME = "jarvis.sid";

export function getFrontendRootUrl() {
  return new URL("/", `${FRONTEND_URL}/`).toString();
}


export const AUTHENTIK_BASE_URL =
  process.env.AUTHENTIK_BASE_URL ?? "https://auth.jarvis.leongrass.ch";

export const AUTHENTIK_APP_SLUG =
  process.env.AUTHENTIK_APP_SLUG ?? "jarvis";

export const POST_LOGOUT_REDIRECT_URL =
  process.env.POST_LOGOUT_REDIRECT_URL ?? "https://jarvis.leongrass.ch";

export const JARVIS_TRUSTED_BACKEND_SECRET = readStringEnv(
  "JARVIS_TRUSTED_BACKEND_SECRET",
  "replace-me",
);