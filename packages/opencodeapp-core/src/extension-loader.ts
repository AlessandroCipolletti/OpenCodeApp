import * as fs from "fs";
import * as path from "path";
import type { ExtensionManifest } from "@opencodeapp/ext";
import { validateManifest } from "@opencodeapp/ext";

export interface LoadedExtension {
  tenantId: string;
  manifest: ExtensionManifest;
  extensionDir: string;
}

/**
 * Discovers and loads all extensions for a given tenant.
 * Extensions live in: tenants/{tenantId}/extensions/{extensionName}/
 * Each extension must have a manifest.json at its root.
 */
export class ExtensionLoader {
  constructor(private readonly tenantsRoot: string) {}

  /**
   * Load all valid extensions for the given tenant.
   */
  loadForTenant(tenantId: string): LoadedExtension[] {
    const extensionsDir = path.join(
      this.tenantsRoot,
      tenantId,
      "extensions"
    );

    if (!fs.existsSync(extensionsDir)) {
      return [];
    }

    const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
    const extensions: LoadedExtension[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const extDir = path.join(extensionsDir, entry.name);
      const manifestPath = path.join(extDir, "manifest.json");

      if (!fs.existsSync(manifestPath)) {
        console.warn(
          `[ExtensionLoader] No manifest.json in ${extDir}, skipping.`
        );
        continue;
      }

      try {
        const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        const manifest = validateManifest(raw);
        extensions.push({ tenantId, manifest, extensionDir: extDir });
      } catch (err) {
        console.error(
          `[ExtensionLoader] Failed to load extension in ${extDir}:`,
          err
        );
      }
    }

    return extensions;
  }
}
