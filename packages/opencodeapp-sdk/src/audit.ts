import type { AuditSdk, AuditEntry, SdkContext } from "./types";

export type PersistedAuditEntry = AuditEntry & {
  tenantId: string;
  extensionName: string;
  timestamp: string;
};

export function createAuditSdk(
  context: SdkContext,
  persist: (entry: PersistedAuditEntry) => Promise<void>
): AuditSdk {
  return {
    async log(entry: AuditEntry): Promise<void> {
      await persist({
        ...entry,
        tenantId: context.tenantId,
        extensionName: context.extensionName,
        timestamp: new Date().toISOString(),
      });
    },
  };
}
