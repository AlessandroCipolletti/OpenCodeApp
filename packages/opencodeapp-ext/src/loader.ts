import * as fs from "fs";
import * as path from "path";
import type { ExtensionManifest } from "./manifest";
import { validateManifest } from "./manifest";

export interface ExtensionRecord {
  name: string;
  manifest: ExtensionManifest;
  dir: string;
}

/**
 * Loads extension manifests from disk for a given tenant.
 */
export class ExtensionLoader {
  constructor(private readonly tenantsRoot: string) {}

  load(tenantId: string): ExtensionRecord[] {
    const extRoot = path.join(this.tenantsRoot, tenantId, "extensions");
    if (!fs.existsSync(extRoot)) return [];

    return fs
      .readdirSync(extRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((e) => {
        const dir = path.join(extRoot, e.name);
        const manifestPath = path.join(dir, "manifest.json");
        if (!fs.existsSync(manifestPath)) return [];
        try {
          const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
          const manifest = validateManifest(raw);
          return [{ name: e.name, manifest, dir }];
        } catch (err) {
          console.error(`[Loader] Skipping ${dir}:`, err);
          return [];
        }
      });
  }
}
