import { prisma, getTenantBySlug, getOrCreateTenant } from '@opencodeapp/db';

export interface TenantContext {
  tenantId: string;
  slug: string;
  schemaName: string;
}

export async function resolveTenantContext(slug: string): Promise<TenantContext> {
  const tenant = await getOrCreateTenant(slug);
  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    schemaName: tenant.schemaName,
  };
}

export async function getTenantContext(slug: string): Promise<TenantContext | null> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return null;
  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    schemaName: tenant.schemaName,
  };
}

export { prisma };
