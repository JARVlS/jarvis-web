import { apiUrl, authUrl } from "../config/api";
import type {
  ChatResponse,
  CurrentUserResponse,
  PowerAction,
  StatusResponse,
} from "../types/jarvis";

function getErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const maybeError = (body as { error?: unknown }).error;
  return typeof maybeError === "string" ? maybeError : undefined;
}

async function postJson<T>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(getErrorMessage(body) ?? `${response.status} ${response.statusText}`);
  }

  return body as T;
}

export async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch(apiUrl("/status"), {
    credentials: "include",
  });
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(body) ?? `${response.status} ${response.statusText}`);
  }

  return (body ?? {}) as StatusResponse;
}

export function sendChatMessage(message: string, sessionId?: string) {
  return postJson<ChatResponse>("/chat", { message, sessionId });
}

export function sendPowerAction(action: PowerAction) {
  return postJson<Record<string, unknown>>(`/power/${action}`);
}

export async function fetchCurrentUser(): Promise<CurrentUserResponse | null> {
  const response = await fetch(apiUrl("/me"), {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(getErrorMessage(body) ?? `${response.status} ${response.statusText}`);
  }

  return body as CurrentUserResponse;
}

export function beginLogin() {
  window.location.assign(authUrl("/auth/login"));
}
export async function logout(): Promise<void> {
  window.location.assign(authUrl("/auth/logout"));
}