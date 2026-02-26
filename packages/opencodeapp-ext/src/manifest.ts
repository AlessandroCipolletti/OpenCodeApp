import type { RouteDefinition, JobDefinition } from "@opencodeapp/sdk";

export type { RouteDefinition, JobDefinition };

export interface PageManifest {
  name: string;
  file: string;
}

export interface ExtensionManifest {
  name: string;
  version: string;
  description?: string;
  routes?: RouteDefinition[];
  jobs?: JobDefinition[];
  pages?: PageManifest[];
  /**
   * Declared capabilities the extension requires.
   * The runtime will deny SDK calls not covered by declared capabilities.
   */
  capabilities: string[];
}

export type Capability =
  | "data:read"
  | "data:write"
  | "scheduler"
  | "http"
  | "ui"
  | "audit";

const VALID_CAPABILITIES = new Set<string>([
  "data:read",
  "data:write",
  "scheduler",
  "http",
  "ui",
  "audit",
]);

/**
 * Validate and return a typed ExtensionManifest, throwing if invalid.
 */
export function validateManifest(raw: unknown): ExtensionManifest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Manifest must be a JSON object.");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj["name"] !== "string" || !obj["name"]) {
    throw new Error('Manifest must have a non-empty string "name".');
  }

  if (typeof obj["version"] !== "string" || !obj["version"]) {
    throw new Error('Manifest must have a non-empty string "version".');
  }

  if (!Array.isArray(obj["capabilities"])) {
    throw new Error('Manifest must have a "capabilities" array.');
  }

  const invalidCaps = (obj["capabilities"] as string[]).filter(
    (c) => !VALID_CAPABILITIES.has(c)
  );
  if (invalidCaps.length > 0) {
    throw new Error(
      `Manifest contains unknown capabilities: ${invalidCaps.join(", ")}. ` +
        `Valid capabilities: ${[...VALID_CAPABILITIES].join(", ")}`
    );
  }

  return obj as unknown as ExtensionManifest;
}
