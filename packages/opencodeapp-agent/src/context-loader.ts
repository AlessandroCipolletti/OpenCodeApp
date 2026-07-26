import fs from 'fs';
import path from 'path';

export interface ExtensionContext {
  files: Array<{ path: string; content: string }>;
}

const MAX_CONTEXT_FILES = 20;
const MAX_FILE_SIZE = 50_000; // 50KB per file

export function loadExtensionContext(
  tenantsDir: string,
  tenantSlug: string,
): ExtensionContext {
  const extDir = path.join(tenantsDir, tenantSlug, 'extensions');

  if (!fs.existsSync(extDir)) {
    return { files: [] };
  }

  const files: Array<{ path: string; content: string }> = [];
  collectFiles(tenantsDir, tenantSlug, extDir, files, 0);

  return { files: files.slice(0, MAX_CONTEXT_FILES) };
}

function collectFiles(
  tenantsDir: string,
  tenantSlug: string,
  dir: string,
  files: Array<{ path: string; content: string }>,
  depth: number,
): void {
  if (depth > 5) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist' || entry.name === 'node_modules') continue;
      collectFiles(tenantsDir, tenantSlug, fullPath, files, depth + 1);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css'].includes(ext)) {
        const stat = fs.statSync(fullPath);
        if (stat.size <= MAX_FILE_SIZE) {
          // Paths must match what the agent is allowed to patch
          const relativeFromTenants = path.relative(
            path.join(tenantsDir, tenantSlug),
            fullPath,
          );
          files.push({
            path: `tenants/${tenantSlug}/${relativeFromTenants.replace(/\\/g, '/')}`,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        }
      }
    }
  }
}
