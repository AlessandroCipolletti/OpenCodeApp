import { PrismaClient } from "@prisma/client";

/**
 * Helper for per-tenant PostgreSQL schema operations.
 * Each tenant gets its own schema (e.g. "tenant_tenant-1") for isolation.
 */
export class TenantSchemaHelper {
  constructor(private readonly prisma: PrismaClient) {}

  /** Derive the PostgreSQL schema name from a tenant slug. */
  static schemaName(tenantSlug: string): string {
    return `tenant_${tenantSlug.replace(/[^a-z0-9_]/gi, "_")}`;
  }

  /** Create the per-tenant schema if it doesn't already exist. */
  async ensureSchema(tenantSlug: string): Promise<void> {
    const schema = TenantSchemaHelper.schemaName(tenantSlug);
    await this.prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS "${schema}"`
    );
  }

  /** Drop the per-tenant schema (use with extreme caution). */
  async dropSchema(tenantSlug: string): Promise<void> {
    const schema = TenantSchemaHelper.schemaName(tenantSlug);
    await this.prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schema}" CASCADE`
    );
  }

  /** List all tenant schemas present in the database. */
  async listSchemas(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `;
    return rows.map((r) => r.schema_name);
  }
}
