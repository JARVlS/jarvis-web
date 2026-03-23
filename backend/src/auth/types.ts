export interface UserContext {
  user_id: number;
  email: string;
  display_name: string | null;
  roles: string[];
  scopes: string[];
  private_rag_namespace: string;
  shared_rag_namespaces: string[];
}

export interface AppUserRecord {
  id: number;
  oidc_sub: string;
  email: string;
  display_name: string | null;
  private_rag_namespace: string;
  shared_rag_namespaces: string[];
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface OidcUserProfile {
  sub: string;
  email: string;
  display_name: string | null;
}

export interface ToolDefinition {
  name: string;
  display_name: string;
  description: string;
  input_schema: Record<string, unknown>;
  required_scope: string | null;
}
