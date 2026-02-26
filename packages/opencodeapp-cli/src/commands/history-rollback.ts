import { Command } from 'commander';
import { getTenantBySlug, prisma } from '@opencodeapp/db';
import { restoreSnapshot } from '@opencodeapp/agent';
import path from 'path';

export function historyRollbackCommand(): Command {
  return new Command('history:rollback')
    .description('Rollback a tenant to a previous release')
    .argument('<tenant-slug>', 'Tenant slug')
    .argument('<version>', 'Release version to rollback to')
    .option('--reason <reason>', 'Reason for rollback')
    .action(async (tenantSlug: string, version: string, options: { reason?: string }) => {
      try {
        const tenant = await getTenantBySlug(tenantSlug);
        if (!tenant) {
          console.error(`❌ Tenant "${tenantSlug}" not found`);
          process.exit(1);
        }

        const release = await prisma.agentRelease.findFirst({
          where: { tenantId: tenant.id, version: parseInt(version, 10) },
        });

        if (!release) {
          console.error(`❌ Release v${version} not found for tenant "${tenantSlug}"`);
          process.exit(1);
        }

        const tenantsDir = process.env.TENANTS_DIR
          ? path.resolve(process.env.TENANTS_DIR)
          : path.resolve(process.cwd(), '..', '..', 'tenants');

        console.log(`⏪ Rolling back tenant "${tenantSlug}" to v${version}...`);

        await restoreSnapshot(
          release.id,
          tenant.id,
          tenantSlug,
          tenantsDir,
          options.reason,
        );

        console.log(`✅ Rolled back to v${version} successfully`);
      } catch (err) {
        console.error('❌ Error:', (err as Error).message);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
