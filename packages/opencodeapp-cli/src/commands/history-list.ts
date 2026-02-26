import { Command } from 'commander';
import { prisma, getTenantBySlug } from '@opencodeapp/db';

export function historyListCommand(): Command {
  return new Command('history:list')
    .description('List releases for a tenant')
    .argument('<tenant-slug>', 'Tenant slug')
    .option('--limit <n>', 'Max releases to show', '20')
    .action(async (tenantSlug: string, options: { limit?: string }) => {
      try {
        const tenant = await getTenantBySlug(tenantSlug);
        if (!tenant) {
          console.error(`❌ Tenant "${tenantSlug}" not found`);
          process.exit(1);
        }

        const releases = await prisma.agentRelease.findMany({
          where: { tenantId: tenant.id },
          orderBy: { version: 'desc' },
          take: parseInt(options.limit ?? '20', 10),
        });

        if (releases.length === 0) {
          console.log('No releases found.');
          return;
        }

        console.log(`\nReleases for tenant "${tenantSlug}":\n`);
        for (const release of releases) {
          const active = release.isActive ? ' [ACTIVE]' : '';
          console.log(`  v${release.version}${active}  ${release.createdAt.toISOString()}  ${release.description ?? ''}`);
        }
        console.log('');
      } catch (err) {
        console.error('❌ Error:', (err as Error).message);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
