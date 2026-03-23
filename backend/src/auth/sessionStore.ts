import session from "express-session";
import { db } from "../db.js";

interface SessionRow {
  data: string;
  expires_at: number;
}

const selectSessionStatement = db.prepare(`
  SELECT data, expires_at
  FROM session_store
  WHERE sid = ?
`);

const upsertSessionStatement = db.prepare(`
  INSERT INTO session_store (sid, data, expires_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(sid) DO UPDATE SET
    data = excluded.data,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at
`);

const deleteSessionStatement = db.prepare(`
  DELETE FROM session_store
  WHERE sid = ?
`);

const deleteExpiredSessionsStatement = db.prepare(`
  DELETE FROM session_store
  WHERE expires_at <= ?
`);

function resolveExpiresAt(sessionData: session.SessionData) {
  const cookieExpires = sessionData.cookie?.expires;
  if (cookieExpires instanceof Date) {
    return cookieExpires.getTime();
  }

  if (typeof cookieExpires === "string") {
    const parsed = new Date(cookieExpires);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return Date.now() + 7 * 24 * 60 * 60 * 1_000;
}

function cleanupExpiredSessions() {
  deleteExpiredSessionsStatement.run(Date.now());
}

export class SQLiteSessionStore extends session.Store {
  get(
    sid: string,
    callback: (error: unknown, sessionValue?: session.SessionData | null) => void,
  ) {
    try {
      cleanupExpiredSessions();
      const row = selectSessionStatement.get(sid) as SessionRow | undefined;

      if (!row) {
        callback(null, null);
        return;
      }

      if (row.expires_at <= Date.now()) {
        deleteSessionStatement.run(sid);
        callback(null, null);
        return;
      }

      const sessionData = JSON.parse(row.data) as session.SessionData & {
        cookie?: { expires?: string };
      };

      if (typeof sessionData.cookie?.expires === "string") {
        sessionData.cookie.expires = new Date(sessionData.cookie.expires) as never;
      }

      callback(null, sessionData);
    } catch (error) {
      callback(error);
    }
  }

  set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (error?: unknown) => void,
  ) {
    try {
      cleanupExpiredSessions();
      upsertSessionStatement.run(
        sid,
        JSON.stringify(sessionData),
        resolveExpiresAt(sessionData),
        new Date().toISOString(),
      );
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid: string, callback?: (error?: unknown) => void) {
    try {
      deleteSessionStatement.run(sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  touch(
    sid: string,
    sessionData: session.SessionData,
    callback?: (error?: unknown) => void,
  ) {
    this.set(sid, sessionData, callback);
  }
}
