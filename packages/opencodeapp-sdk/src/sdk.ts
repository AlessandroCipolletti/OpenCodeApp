import type { OpenCodeAppSdk, SdkDataQueryOptions, SdkDataInsertOptions, SdkSchedulerJob, SdkHttpFetchOptions, SdkUiPage, SdkAuditLogEntry } from './types';

/**
 * Stub SDK used when extensions run without a real backend injector.
 * The real implementation is injected at runtime by opencodeapp-core.
 */
export function createStubSdk(tenantId: string): OpenCodeAppSdk {
  const registeredJobs: SdkSchedulerJob[] = [];
  const registeredPages: SdkUiPage[] = [];

  return {
    tenantId,

    data: {
      async query(_options: SdkDataQueryOptions): Promise<unknown[]> {
        throw new Error('SDK not initialized: data.query called outside of runtime context');
      },
      async insert(_options: SdkDataInsertOptions): Promise<unknown> {
        throw new Error('SDK not initialized: data.insert called outside of runtime context');
      },
    },

    scheduler: {
      registerJob(job: SdkSchedulerJob): void {
        registeredJobs.push(job);
      },
    },

    http: {
      async fetchAllowed(_options: SdkHttpFetchOptions): Promise<unknown> {
        throw new Error('SDK not initialized: http.fetchAllowed called outside of runtime context');
      },
    },

    ui: {
      registerPage(page: SdkUiPage): void {
        registeredPages.push(page);
      },
    },

    audit: {
      async log(_entry: SdkAuditLogEntry): Promise<void> {
        console.log('[audit stub]', _entry);
      },
    },
  };
}
