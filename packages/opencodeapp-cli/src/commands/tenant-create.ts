import { Command } from 'commander';
import { getOrCreateTenant, prisma } from '@opencodeapp/db';
import fs from 'fs';
import path from 'path';

export function tenantCreateCommand(): Command {
  return new Command('tenant:create')
    .description('Create a new tenant')
    .argument('<slug>', 'Tenant slug (e.g. tenant-1)')
    .option('--display-name <name>', 'Display name for the tenant')
    .action(async (slug: string, options: { displayName?: string }) => {
      try {
        const tenant = await getOrCreateTenant(slug, options.displayName);
        console.log(`✅ Tenant "${tenant.slug}" created/found (id: ${tenant.id})`);

        // Create extension directory structure
        const tenantsDir = process.env.TENANTS_DIR
          ? path.resolve(process.env.TENANTS_DIR)
          : path.resolve(process.cwd(), '..', '..', 'tenants');

        const extDir = path.join(tenantsDir, slug, 'extensions');
        const releasesDir = path.join(tenantsDir, slug, 'releases');
        fs.mkdirSync(extDir, { recursive: true });
        fs.mkdirSync(releasesDir, { recursive: true });

        // Create default extension manifest if not exists
        const uiExtDir = path.join(extDir, 'ui');
        fs.mkdirSync(uiExtDir, { recursive: true });

        const manifestPath = path.join(uiExtDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
          fs.writeFileSync(manifestPath, JSON.stringify({
            id: 'ui',
            name: 'UI Extension',
            version: '0.1.0',
            description: 'Default UI extension',
            capabilities: [{ type: 'ui.page' }],
            routes: [{ slug: 'custom-items', title: 'Custom Items' }],
            entry: 'index.tsx',
          }, null, 2));
        }

        // Create default extension entry if not exists
        const indexPath = path.join(uiExtDir, 'index.tsx');
        if (!fs.existsSync(indexPath)) {
          fs.writeFileSync(indexPath, `import React from 'react';

export default function ExtensionPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Custom Extension Page</h1>
      <p>This page is managed by the AI agent. Use the assistant to modify it.</p>
    </div>
  );
}
`);
        }

        console.log(`📁 Extension directories created at ${extDir}`);
      } catch (err) {
        console.error('❌ Error:', (err as Error).message);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
