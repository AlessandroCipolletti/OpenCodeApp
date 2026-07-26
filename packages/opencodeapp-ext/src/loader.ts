import fs from 'fs';
import path from 'path';
import { validateManifest } from '@opencodeapp/sdk';
import { registerExtension } from './registry';
import { buildExtension } from './bundler';

export async function loadExtensionsForTenant(
  tenantId: string,
  tenantsDir: string,
  tenantSlug: string,
): Promise<void> {
  const extDir = path.join(tenantsDir, tenantSlug, 'extensions');

  if (!fs.existsSync(extDir)) {
    return;
  }

  const entries = fs.readdirSync(extDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const extPath = path.join(extDir, entry.name);
    await loadExtension(tenantId, extPath, entry.name);
  }
}

export async function loadExtension(
  tenantId: string,
  extPath: string,
  extName: string,
): Promise<void> {
  const manifestPath = path.join(extPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.warn(`[ext] No manifest.json found at ${manifestPath}, skipping`);
    return;
  }

  const manifestRaw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (!validateManifest(manifestRaw)) {
    console.warn(`[ext] Invalid manifest at ${manifestPath}, skipping`);
    return;
  }

  const entryPoint = path.join(extPath, manifestRaw.entry ?? 'index.tsx');
  let bundlePath = path.join(extPath, 'dist', 'bundle.js');

  if (fs.existsSync(entryPoint)) {
    bundlePath = await buildExtension(entryPoint, path.join(extPath, 'dist'));
  } else if (!fs.existsSync(bundlePath)) {
    console.warn(`[ext] No entry point or bundle found for extension ${extName}, skipping`);
    return;
  }

  registerExtension({
    tenantId,
    manifest: manifestRaw,
    bundlePath,
    loadedAt: new Date(),
  });

  console.log(`[ext] Loaded extension "${manifestRaw.name}" for tenant ${tenantId}`);
}
