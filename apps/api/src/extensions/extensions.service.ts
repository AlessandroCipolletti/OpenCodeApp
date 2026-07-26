import { Injectable, NotFoundException } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { validateManifest, type ExtensionRoute } from '@opencodeapp/sdk';
import { buildExtensionHostBundle } from '@opencodeapp/ext';
import { resolveTenantsDir } from '../paths';

const TENANTS_DIR = resolveTenantsDir();

export interface ExtensionRouteDto extends ExtensionRoute {
  extensionId: string;
  href: string;
}

@Injectable()
export class ExtensionsService {
  listRoutes(tenantSlug: string): ExtensionRouteDto[] {
    const extRoot = path.join(TENANTS_DIR, tenantSlug, 'extensions');
    if (!fs.existsSync(extRoot)) return [];

    const routes: ExtensionRouteDto[] = [];
    for (const entry of fs.readdirSync(extRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(extRoot, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (!validateManifest(raw)) continue;

      for (const route of raw.routes ?? []) {
        routes.push({
          ...route,
          extensionId: raw.id,
          href: `/ext/${route.slug}`,
        });
      }
    }
    return routes;
  }

  async getHostBundle(tenantSlug: string, extensionId = 'ui'): Promise<string> {
    const extDir = path.join(TENANTS_DIR, tenantSlug, 'extensions', extensionId);
    const manifestPath = path.join(extDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new NotFoundException(`Extension "${extensionId}" not found`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const entry = path.join(extDir, manifest.entry ?? 'index.tsx');
    if (!fs.existsSync(entry)) {
      throw new NotFoundException(`Extension entry not found: ${entry}`);
    }

    const outFile = await buildExtensionHostBundle(entry, path.join(extDir, 'dist'));
    return fs.readFileSync(outFile, 'utf-8');
  }
}
