import { createRealSdk } from './sdk-factory';
import type { OpenCodeAppSdk } from '@opencodeapp/sdk';

const sdkCache = new Map<string, OpenCodeAppSdk>();

export function getSdk(tenantId: string): OpenCodeAppSdk {
  if (!sdkCache.has(tenantId)) {
    sdkCache.set(tenantId, createRealSdk(tenantId));
  }
  return sdkCache.get(tenantId)!;
}

export function clearSdkCache(): void {
  sdkCache.clear();
}
