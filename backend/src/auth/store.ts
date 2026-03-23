import { createHash } from "node:crypto";
import { db } from "../db.js";
import type { AppUserRecord, OidcUserProfile, UserContext } from "./types.js";

interface UserRow {
  id: number;
  oidc_sub: string;
  email: string;
  display_name: string | null;
  private_rag_namespace: string;
  shared_rag_namespaces_json: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

interface NameRow {
  name: string;
}

const DEFAULT_SCOPES = [
  {
    name: "chat:use",
    description: "Send chat requests to the workstation Jarvis brain.",
  },
  {
    name: "power:control",
    description: "Control workstation power actions through Jarvis.",
  },
] as const;

const DEFAULT_ROLES = [
  {
    name: "owner",
    description: "Full Jarvis operator access.",
    scopes: ["chat:use", "power:control"],
  },
  {
    name: "member",
    description: "Standard Jarvis chat access.",
    scopes: ["chat:use"],
  },
] as const;

const upsertScopeStatement = db.prepare(`
  INSERT INTO app_scope (name, description)
  VALUES (?, ?)
  ON CONFLICT(name) DO UPDATE SET description = excluded.description
`);

const upsertRoleStatement = db.prepare(`
  INSERT INTO app_role (name, description)
  VALUES (?, ?)
  ON CONFLICT(name) DO UPDATE SET description = excluded.description
`);

const attachRoleScopeStatement = db.prepare(`
  INSERT OR IGNORE INTO role_scope (role_id, scope_id)
  VALUES (
    (SELECT id FROM app_role WHERE name = ?),
    (SELECT id FROM app_scope WHERE name = ?)
  )
`);

const findUserBySubStatement = db.prepare(`
  SELECT *
  FROM app_user
  WHERE oidc_sub = ?
`);

const findUserByIdStatement = db.prepare(`
  SELECT *
  FROM app_user
  WHERE id = ?
`);

const insertUserStatement = db.prepare(`
  INSERT INTO app_user (
    oidc_sub,
    email,
    display_name,
    private_rag_namespace,
    shared_rag_namespaces_json,
    created_at,
    updated_at,
    last_login_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateUserStatement = db.prepare(`
  UPDATE app_user
  SET email = ?, display_name = ?, updated_at = ?, last_login_at = ?
  WHERE id = ?
`);

const assignRoleStatement = db.prepare(`
  INSERT OR IGNORE INTO user_role (user_id, role_id)
  VALUES (?, (SELECT id FROM app_role WHERE name = ?))
`);

const ownerCountStatement = db.prepare(`
  SELECT COUNT(*) AS count
  FROM user_role ur
  INNER JOIN app_role ar ON ar.id = ur.role_id
  WHERE ar.name = 'owner'
`);

const userRolesStatement = db.prepare(`
  SELECT ar.name
  FROM app_role ar
  INNER JOIN user_role ur ON ur.role_id = ar.id
  WHERE ur.user_id = ?
  ORDER BY ar.name
`);

const userScopesStatement = db.prepare(`
  SELECT DISTINCT aps.name
  FROM app_scope aps
  INNER JOIN role_scope rs ON rs.scope_id = aps.id
  INNER JOIN user_role ur ON ur.role_id = rs.role_id
  WHERE ur.user_id = ?
  ORDER BY aps.name
`);

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string");
    }
  } catch {
    return [];
  }

  return [];
}

function toAppUserRecord(row: UserRow): AppUserRecord {
  return {
    id: row.id,
    oidc_sub: row.oidc_sub,
    email: row.email,
    display_name: row.display_name,
    private_rag_namespace: row.private_rag_namespace,
    shared_rag_namespaces: parseJsonArray(row.shared_rag_namespaces_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at,
  };
}

function buildPrivateNamespace(oidcSub: string) {
  const digest = createHash("sha256").update(oidcSub).digest("hex").slice(0, 24);
  return `user:${digest}`;
}

function getUserBySub(oidcSub: string) {
  const row = findUserBySubStatement.get(oidcSub) as UserRow | undefined;
  return row ? toAppUserRecord(row) : null;
}

function getUserById(userId: number) {
  const row = findUserByIdStatement.get(userId) as UserRow | undefined;
  return row ? toAppUserRecord(row) : null;
}

function assignRole(userId: number, roleName: string) {
  assignRoleStatement.run(userId, roleName);
}

export function bootstrapAuthorizationData() {
  for (const scope of DEFAULT_SCOPES) {
    upsertScopeStatement.run(scope.name, scope.description);
  }

  for (const role of DEFAULT_ROLES) {
    upsertRoleStatement.run(role.name, role.description);
    for (const scopeName of role.scopes) {
      attachRoleScopeStatement.run(role.name, scopeName);
    }
  }
}

export function upsertOidcUser(profile: OidcUserProfile) {
  const now = new Date().toISOString();
  const existing = getUserBySub(profile.sub);

  if (existing) {
    updateUserStatement.run(
      profile.email,
      profile.display_name,
      now,
      now,
      existing.id,
    );
    assignRole(existing.id, "member");

    const ownerCount = ownerCountStatement.get() as { count: number };
    if (ownerCount.count === 0) {
      assignRole(existing.id, "owner");
    }

    return getUserById(existing.id)!;
  }

  insertUserStatement.run(
    profile.sub,
    profile.email,
    profile.display_name,
    buildPrivateNamespace(profile.sub),
    JSON.stringify([]),
    now,
    now,
    now,
  );

  const created = getUserBySub(profile.sub);
  if (!created) {
    throw new Error("Unable to create local Jarvis user");
  }

  assignRole(created.id, "member");

  const ownerCount = ownerCountStatement.get() as { count: number };
  if (ownerCount.count === 0) {
    assignRole(created.id, "owner");
  }

  return getUserById(created.id)!;
}

export function getUserContextById(userId: number): UserContext | null {
  const user = getUserById(userId);
  if (!user) {
    return null;
  }

  const roles = ((userRolesStatement.all(userId) as unknown) as NameRow[]).map(
    (row) => row.name,
  );
  const scopes = ((userScopesStatement.all(userId) as unknown) as NameRow[]).map(
    (row) => row.name,
  );

  return {
    user_id: user.id,
    email: user.email,
    display_name: user.display_name,
    roles,
    scopes,
    private_rag_namespace: user.private_rag_namespace,
    shared_rag_namespaces: user.shared_rag_namespaces,
  };
}
