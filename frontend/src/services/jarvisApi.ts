import { apiUrl, authUrl } from "../config/api";
import type {
  ChatStreamEvent,
  ChatStreamResult,
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

async function getResponseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as unknown;
  return getErrorMessage(body) ?? `${response.status} ${response.statusText}`;
}

function getNestedString(value: unknown, path: readonly string[]): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : undefined;
}

function getFirstString(
  value: unknown,
  paths: readonly (readonly string[])[],
): string | undefined {
  for (const path of paths) {
    const result = getNestedString(value, path);
    if (result && result.length > 0) {
      return result;
    }
  }

  return undefined;
}

function getEventKind(event: ChatStreamEvent): string {
  return (
    getFirstString(event, [["type"], ["event"], ["kind"], ["data", "type"]])?.toLowerCase() ??
    ""
  );
}

function isDeltaEvent(event: ChatStreamEvent): boolean {
  return /(delta|token|chunk|stream)/i.test(getEventKind(event));
}

function isFinalEvent(event: ChatStreamEvent): boolean {
  return /(complete|completed|final|done|message|assistant|response|output)/i.test(
    getEventKind(event),
  );
}

function extractStreamSessionId(event: ChatStreamEvent): string | undefined {
  return getFirstString(event, [
    ["session_id"],
    ["sessionId"],
    ["conversation_id"],
    ["conversationId"],
    ["data", "session_id"],
    ["data", "sessionId"],
    ["data", "conversation_id"],
    ["data", "conversationId"],
  ]);
}

function extractStreamTextDelta(event: ChatStreamEvent): string | undefined {
  const directDelta = getFirstString(event, [
    ["delta"],
    ["delta", "text"],
    ["delta", "content"],
    ["token"],
    ["text_delta"],
    ["content_delta"],
    ["data", "delta"],
    ["data", "delta", "text"],
    ["data", "delta", "content"],
  ]);

  if (directDelta) {
    return directDelta;
  }

  if (isDeltaEvent(event)) {
    return getFirstString(event, [["text"], ["content"], ["data", "text"], ["data", "content"]]);
  }

  return undefined;
}

function extractStreamFullText(event: ChatStreamEvent): string | undefined {
  if (isDeltaEvent(event)) {
    return undefined;
  }

  const directReply = getFirstString(event, [
    ["reply_text"],
    ["reply"],
    ["data", "reply_text"],
    ["data", "reply"],
  ]);

  if (directReply) {
    return directReply;
  }

  if (isFinalEvent(event)) {
    return getFirstString(event, [
      ["message"],
      ["content"],
      ["text"],
      ["data", "message"],
      ["data", "content"],
      ["data", "text"],
    ]);
  }

  return undefined;
}

function normalizeStreamLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "[DONE]") {
    return null;
  }

  if (trimmed.startsWith("data:")) {
    return trimmed.slice(5).trim();
  }

  return trimmed;
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

export async function streamChatMessage(
  message: string,
  options: {
    onSessionId?: (sessionId: string) => void;
    onText?: (text: string) => void;
    onTextDelta?: (delta: string) => void;
    sessionId?: string;
    signal?: AbortSignal;
  } = {},
): Promise<ChatStreamResult> {
  const response = await fetch(apiUrl("/chat/stream"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: options.sessionId,
      message,
      sessionId: options.sessionId,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  if (!response.body) {
    throw new Error("Chat stream response body was empty.");
  }

  const result: ChatStreamResult = {
    events: [],
  };
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const handleLine = (line: string) => {
    const normalized = normalizeStreamLine(line);
    if (!normalized) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(normalized);
    } catch {
      result.finalText = `${result.finalText ?? ""}${normalized}`;
      options.onTextDelta?.(normalized);
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const event = parsed as ChatStreamEvent;
    result.events.push(event);

    const eventError = getErrorMessage(event);
    if (eventError) {
      throw new Error(eventError);
    }

    const nextSessionId = extractStreamSessionId(event);
    if (nextSessionId) {
      result.sessionId = nextSessionId;
      options.onSessionId?.(nextSessionId);
    }

    const replacementText = extractStreamFullText(event);
    if (replacementText !== undefined) {
      result.finalText = replacementText;
      options.onText?.(replacementText);
    }

    const deltaText = extractStreamTextDelta(event);
    if (deltaText) {
      result.finalText = `${result.finalText ?? ""}${deltaText}`;
      options.onTextDelta?.(deltaText);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      handleLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    handleLine(buffer);
  }

  return result;
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
