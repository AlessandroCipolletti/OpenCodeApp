import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@opencodeapp/db';
import { restoreSnapshot } from '@opencodeapp/agent';
import { resolveTenantsDir } from '../paths';

const TENANTS_DIR = resolveTenantsDir();

@Injectable()
export class ReleasesService {
  async findAll(tenantId: string) {
    return prisma.agentRelease.findMany({
      where: { tenantId },
      orderBy: { version: 'desc' },
      take: 50,
    });
  }

  async rollback(releaseId: string, tenantId: string, tenantSlug: string, reason?: string) {
    const release = await prisma.agentRelease.findUnique({ where: { id: releaseId } });
    if (!release || release.tenantId !== tenantId) {
      throw new NotFoundException('Release not found');
    }
    await restoreSnapshot(releaseId, tenantId, tenantSlug, TENANTS_DIR, reason);
    return { success: true, version: release.version };
  }
}
