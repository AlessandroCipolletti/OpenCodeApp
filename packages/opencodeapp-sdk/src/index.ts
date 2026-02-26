export type {
  OpenCodeAppSdk,
  SdkContext,
  DataSdk,
  SchedulerSdk,
  HttpSdk,
  UiSdk,
  AuditSdk,
  QueryOptions,
  InsertOptions,
  JobDefinition,
  RouteDefinition,
  PageDefinition,
  AuditEntry,
} from "./types";

export { createDataSdk } from "./data";
export { createSchedulerSdk, getRegisteredJobs } from "./scheduler";
export { createHttpSdk } from "./http";
export { createUiSdk, getRegisteredPages } from "./ui";
export { createAuditSdk } from "./audit";
export type { PersistedAuditEntry } from "./audit";

import type { OpenCodeAppSdk, SdkContext, AuditEntry } from "./types";
import { createDataSdk } from "./data";
import { createSchedulerSdk } from "./scheduler";
import { createHttpSdk } from "./http";
import { createUiSdk } from "./ui";
import { createAuditSdk } from "./audit";
import type { PersistedAuditEntry } from "./audit";

export interface SdkDependencies {
  executeQuery: (sql: string, params: unknown[]) => Promise<unknown[]>;
  executeInsert: (sql: string, params: unknown[]) => Promise<unknown>;
  persistAuditEntry: (entry: PersistedAuditEntry) => Promise<void>;
  allowedDomains?: string[];
}

/**
 * Factory function that creates a fully scoped SDK instance for an extension.
 */
export function createSdk(
  context: SdkContext,
  deps: SdkDependencies
): OpenCodeAppSdk {
  return {
    context,
    data: createDataSdk(context, deps.executeQuery, deps.executeInsert),
    scheduler: createSchedulerSdk(),
    http: createHttpSdk(context, deps.allowedDomains),
    ui: createUiSdk(),
    audit: createAuditSdk(context, deps.persistAuditEntry),
  };
}
