export interface ExtensionCapability {
  type: 'data.query' | 'data.insert' | 'scheduler' | 'http.fetch' | 'ui.page' | 'audit';
  /** Additional config for the capability (e.g. allowed URLs for http.fetch) */
  config?: Record<string, unknown>;
}

export interface ExtensionRoute {
  slug: string;
  title: string;
  description?: string;
}

export interface ExtensionDbUsage {
  /** Tables the extension creates (must start with ext_ or be in schema ext) */
  tables: string[];
  /** Migration files under the extension's db/ folder */
  migrations?: string[];
}

export interface ExtensionManifest {
  /** Extension identifier, must be unique within the tenant */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version (semver) */
  version: string;
  /** Description */
  description?: string;
  /** Capabilities required by this extension */
  capabilities: ExtensionCapability[];
  /** UI pages registered by this extension */
  routes?: ExtensionRoute[];
  /** DB tables/migrations used by this extension */
  db?: ExtensionDbUsage;
  /** Entry point relative to extension root */
  entry?: string;
}

export function validateManifest(manifest: unknown): manifest is ExtensionManifest {
  if (typeof manifest !== 'object' || manifest === null) return false;
  const m = manifest as Record<string, unknown>;
  if (typeof m['id'] !== 'string' || !m['id']) return false;
  if (typeof m['name'] !== 'string' || !m['name']) return false;
  if (typeof m['version'] !== 'string' || !m['version']) return false;
  if (!Array.isArray(m['capabilities'])) return false;
  return true;
}
