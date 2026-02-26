import type { ExtensionManifest } from '@opencodeapp/sdk';

export interface LoadedExtension {
  tenantId: string;
  manifest: ExtensionManifest;
  bundlePath: string;
  loadedAt: Date;
}

const registry = new Map<string, LoadedExtension>();

export function registerExtension(ext: LoadedExtension): void {
  const key = `${ext.tenantId}:${ext.manifest.id}`;
  registry.set(key, ext);
}

export function getExtension(tenantId: string, extensionId: string): LoadedExtension | undefined {
  return registry.get(`${tenantId}:${extensionId}`);
}

export function getExtensionsForTenant(tenantId: string): LoadedExtension[] {
  return Array.from(registry.values()).filter(e => e.tenantId === tenantId);
}

export function clearExtensionRegistry(): void {
  registry.clear();
}
