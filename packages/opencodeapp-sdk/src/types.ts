export interface SdkDataQueryOptions {
  table: string;
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
}

export interface SdkDataInsertOptions {
  table: string;
  data: Record<string, unknown>;
}

export interface SdkSchedulerJob {
  name: string;
  cron: string;
  handler: () => Promise<void>;
}

export interface SdkHttpFetchOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface SdkUiPage {
  slug: string;
  title: string;
  component: React.ComponentType<unknown>;
}

export interface SdkAuditLogEntry {
  action: string;
  details?: Record<string, unknown>;
}

export interface OpenCodeAppSdk {
  tenantId: string;

  data: {
    query(options: SdkDataQueryOptions): Promise<unknown[]>;
    insert(options: SdkDataInsertOptions): Promise<unknown>;
  };

  scheduler: {
    registerJob(job: SdkSchedulerJob): void;
  };

  http: {
    fetchAllowed(options: SdkHttpFetchOptions): Promise<unknown>;
  };

  ui: {
    registerPage(page: SdkUiPage): void;
  };

  audit: {
    log(entry: SdkAuditLogEntry): Promise<void>;
  };
}
