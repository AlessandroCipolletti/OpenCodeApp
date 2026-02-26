import { Command } from 'commander';
import { buildExtension } from '@opencodeapp/ext';
import path from 'path';
import fs from 'fs';

export function extBuildCommand(): Command {
  return new Command('ext:build')
    .description('Build extension bundles for a tenant')
    .argument('<tenant-slug>', 'Tenant slug')
    .option('--ext <name>', 'Specific extension name (default: all)')
    .action(async (tenantSlug: string, options: { ext?: string }) => {
      const tenantsDir = process.env.TENANTS_DIR
        ? path.resolve(process.env.TENANTS_DIR)
        : path.resolve(process.cwd(), '..', '..', 'tenants');

      const extDir = path.join(tenantsDir, tenantSlug, 'extensions');
      if (!fs.existsSync(extDir)) {
        console.error(`❌ Extension directory not found: ${extDir}`);
        process.exit(1);
      }

      const entries = fs.readdirSync(extDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .filter(e => !options.ext || e.name === options.ext);

      for (const entry of entries) {
        const extPath = path.join(extDir, entry.name);
        const indexPath = path.join(extPath, 'index.tsx');
        if (!fs.existsSync(indexPath)) {
          console.warn(`⚠️  Skipping ${entry.name}: no index.tsx`);
          continue;
        }
        console.log(`🔨 Building extension "${entry.name}"...`);
        try {
          const outFile = await buildExtension(indexPath, path.join(extPath, 'dist'));
          console.log(`✅ Built: ${outFile}`);
        } catch (err) {
          console.error(`❌ Failed to build "${entry.name}":`, (err as Error).message);
          process.exit(1);
        }
      }
    });
}
