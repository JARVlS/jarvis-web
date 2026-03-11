export type WorkstationStatusState =
  | "checking"
  | "online"
  | "offline"
  | "unavailable";

export type PowerAction = "wake" | "sleep" | "shutdown";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface WorkstationHealth {
  ok?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface StatusResponse {
  pi?: Record<string, unknown>;
  workstation?: WorkstationHealth;
}

export interface ChatResponse {
  reply_text?: string;
  reply?: string;
  message?: string;
  session_id?: string;
  sessionId?: string;
  [key: string]: unknown;
}
