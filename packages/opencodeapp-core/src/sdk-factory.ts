import type { OpenCodeAppSdk, SdkDataQueryOptions, SdkDataInsertOptions, SdkSchedulerJob, SdkHttpFetchOptions, SdkUiPage, SdkAuditLogEntry } from '@opencodeapp/sdk';
import { prisma } from '@opencodeapp/db';

const ALLOWED_HTTP_DOMAINS: string[] = (process.env.ALLOWED_HTTP_DOMAINS ?? '').split(',').filter(Boolean);

/** Only lowercase letters, digits, and underscores; must start with ext_ */
const SAFE_IDENTIFIER_RE = /^[a-z][a-z0-9_]*$/;

function assertSafeIdentifier(value: string, label: string): void {
  if (!SAFE_IDENTIFIER_RE.test(value)) {
    throw new Error(`sdk: unsafe SQL identifier for ${label}: "${value}"`);
  }
}

function assertExtTable(tableName: string): void {
  assertSafeIdentifier(tableName, 'table');
  if (!tableName.startsWith('ext_')) {
    throw new Error(`sdk: table "${tableName}" is not an extension table (must start with ext_)`);
  }
}

/**
 * Creates a real SDK instance bound to a specific tenant.
 * This is injected by the framework at runtime; extensions never call this directly.
 */
export function createRealSdk(tenantId: string): OpenCodeAppSdk {
  return {
    tenantId,

    data: {
      async query(options: SdkDataQueryOptions): Promise<unknown[]> {
        assertExtTable(options.table);
        const result = await prisma.$queryRawUnsafe<unknown[]>(
          `SELECT * FROM "${options.table}" WHERE "tenant_id" = $1 LIMIT $2 OFFSET $3`,
          tenantId,
          options.limit ?? 100,
          options.offset ?? 0,
        );
        return result;
      },

      async insert(options: SdkDataInsertOptions): Promise<unknown> {
        assertExtTable(options.table);
        const data = { ...options.data, tenant_id: tenantId };
        const keys = Object.keys(data);
        // Validate every column name before interpolation
        keys.forEach(k => assertSafeIdentifier(k, 'column'));
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const cols = keys.map(k => `"${k}"`).join(', ');
        const result = await prisma.$queryRawUnsafe<unknown[]>(
          `INSERT INTO "${options.table}" (${cols}) VALUES (${placeholders}) RETURNING *`,
          ...values,
        );
        return result[0];
      },
    },

    scheduler: {
      registerJob(_job: SdkSchedulerJob): void {
        // Jobs are registered at extension load time; handled by ext package
      },
    },

    http: {
      async fetchAllowed(options: SdkHttpFetchOptions): Promise<unknown> {
        const url = new URL(options.url);
        const hostname = url.hostname;
        if (ALLOWED_HTTP_DOMAINS.length > 0 && !ALLOWED_HTTP_DOMAINS.includes(hostname)) {
          throw new Error(`sdk.http.fetchAllowed: domain "${hostname}" is not in the allow-list`);
        }
        const response = await fetch(options.url, {
          method: options.method ?? 'GET',
          headers: options.headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
        return response.json();
      },
    },

    ui: {
      registerPage(_page: SdkUiPage): void {
        // Pages are collected at extension load time; handled by ext package
      },
    },

    audit: {
      async log(entry: SdkAuditLogEntry): Promise<void> {
        console.log(`[audit][${tenantId}]`, entry.action, entry.details ?? '');
      },
    },
  };
}
