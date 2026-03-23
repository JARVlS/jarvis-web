import { db } from "../db.js";
import type { ToolDefinition } from "../auth/types.js";

interface ToolSeed {
  name: string;
  display_name: string;
  description: string;
  required_scope: string;
  input_schema: Record<string, unknown>;
}

interface ToolRow {
  name: string;
  display_name: string;
  description: string;
  input_schema_json: string;
  required_scope: string | null;
}

const TOOL_SEEDS: ToolSeed[] = [
  {
    name: "wake_workstation",
    display_name: "Wake Workstation",
    description: "Wake the workstation over the Raspberry Pi bridge.",
    required_scope: "power:control",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "sleep_workstation",
    display_name: "Sleep Workstation",
    description: "Put the workstation into sleep mode.",
    required_scope: "power:control",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "shutdown_workstation",
    display_name: "Shutdown Workstation",
    description: "Shut the workstation down cleanly.",
    required_scope: "power:control",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

const EXECUTABLE_TOOL_MAP = {
  wake_workstation: { route: "/api/power/wake" },
  sleep_workstation: { route: "/api/power/sleep" },
  shutdown_workstation: { route: "/api/power/shutdown" },
} as const;

const upsertToolStatement = db.prepare(`
  INSERT INTO tool_definition (
    name,
    display_name,
    description,
    input_schema_json,
    required_scope_id,
    enabled
  )
  VALUES (
    ?,
    ?,
    ?,
    ?,
    (SELECT id FROM app_scope WHERE name = ?),
    1
  )
  ON CONFLICT(name) DO UPDATE SET
    display_name = excluded.display_name,
    description = excluded.description,
    input_schema_json = excluded.input_schema_json,
    required_scope_id = excluded.required_scope_id,
    enabled = excluded.enabled
`);

const listToolsStatement = db.prepare(`
  SELECT
    td.name,
    td.display_name,
    td.description,
    td.input_schema_json,
    aps.name AS required_scope
  FROM tool_definition td
  LEFT JOIN app_scope aps ON aps.id = td.required_scope_id
  WHERE td.enabled = 1
  ORDER BY td.name
`);

export function syncToolDefinitions() {
  for (const tool of TOOL_SEEDS) {
    upsertToolStatement.run(
      tool.name,
      tool.display_name,
      tool.description,
      JSON.stringify(tool.input_schema),
      tool.required_scope,
    );
  }
}

export function getExecutableToolMap() {
  return EXECUTABLE_TOOL_MAP;
}

export function getAvailableToolsForScopes(scopes: string[]): ToolDefinition[] {
  const rows = (listToolsStatement.all() as unknown) as ToolRow[];

  return rows
    .filter((row) => row.name in EXECUTABLE_TOOL_MAP)
    .filter((row) => !row.required_scope || scopes.includes(row.required_scope))
    .map((row) => ({
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      input_schema: JSON.parse(row.input_schema_json) as Record<string, unknown>,
      required_scope: row.required_scope,
    }));
}
