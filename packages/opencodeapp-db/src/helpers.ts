import { prisma } from './client';

export function slugToSchemaName(slug: string): string {
  return slug.replace(/-/g, '_');
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function getOrCreateTenant(slug: string, displayName?: string) {
  return prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      displayName: displayName ?? slug,
      schemaName: slugToSchemaName(slug),
    },
  });
}

export async function getLlmSettings(tenantId: string) {
  return prisma.llmSettings.findUnique({ where: { tenantId } });
}

export async function hasLlmKey(tenantId: string): Promise<boolean> {
  const settings = await getLlmSettings(tenantId);
  return !!(settings?.apiKeyEnc);
}

export async function getActiveRelease(tenantId: string) {
  return prisma.agentRelease.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { version: 'desc' },
  });
}

export async function getNextReleaseVersion(tenantId: string): Promise<number> {
  const latest = await prisma.agentRelease.findFirst({
    where: { tenantId },
    orderBy: { version: 'desc' },
  });
  return (latest?.version ?? 0) + 1;
}
