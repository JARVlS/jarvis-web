import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATABASE_PATH = resolve(process.cwd(), "data", "jarvis.db");

if (!existsSync(dirname(DATABASE_PATH))) {
  mkdirSync(dirname(DATABASE_PATH), { recursive: true });
}

export const db = new DatabaseSync(DATABASE_PATH, {
  enableForeignKeyConstraints: true,
  timeout: 5_000,
});

export function initializeDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS app_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oidc_sub TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      display_name TEXT,
      private_rag_namespace TEXT NOT NULL,
      shared_rag_namespaces_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS app_role (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS user_role (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES app_role(id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE IF NOT EXISTS app_scope (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS role_scope (
      role_id INTEGER NOT NULL,
      scope_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, scope_id),
      FOREIGN KEY (role_id) REFERENCES app_role(id) ON DELETE CASCADE,
      FOREIGN KEY (scope_id) REFERENCES app_scope(id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE IF NOT EXISTS tool_definition (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT NOT NULL,
      input_schema_json TEXT NOT NULL,
      required_scope_id INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (required_scope_id) REFERENCES app_scope(id) ON DELETE SET NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS session_store (
      sid TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
  `);
}
