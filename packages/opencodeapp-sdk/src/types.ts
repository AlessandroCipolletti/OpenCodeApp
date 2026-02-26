// Public SDK types exposed to extensions and apps

export interface SdkContext {
  tenantId: string;
  extensionName: string;
  capabilities: string[];
}

export interface QueryOptions {
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  limit?: number;
  offset?: number;
}

export interface InsertOptions {
  table: string;
  data: Record<string, unknown>;
}

export interface JobDefinition {
  name: string;
  cron: string;
  handler: () => Promise<void>;
}

export interface RouteDefinition {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  handler: string;
}

export interface PageDefinition {
  name: string;
  path: string;
  component: string;
}

export interface AuditEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface DataSdk {
  query: (table: string, options?: QueryOptions) => Promise<unknown[]>;
  insert: (options: InsertOptions) => Promise<unknown>;
}

export interface SchedulerSdk {
  registerJob: (job: JobDefinition) => void;
}

export interface HttpSdk {
  fetchAllowed: (url: string, init?: RequestInit) => Promise<Response>;
}

export interface UiSdk {
  registerPage: (page: PageDefinition) => void;
}

export interface AuditSdk {
  log: (entry: AuditEntry) => Promise<void>;
}

export interface OpenCodeAppSdk {
  data: DataSdk;
  scheduler: SchedulerSdk;
  http: HttpSdk;
  ui: UiSdk;
  audit: AuditSdk;
  context: SdkContext;
}
