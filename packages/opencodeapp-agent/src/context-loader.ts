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
  collectFiles(extDir, extDir, files, 0);

  return { files: files.slice(0, MAX_CONTEXT_FILES) };
}

function collectFiles(
  baseDir: string,
  dir: string,
  files: Array<{ path: string; content: string }>,
  depth: number,
): void {
  if (depth > 5) return; // max depth

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist' || entry.name === 'node_modules') continue;
      collectFiles(baseDir, fullPath, files, depth + 1);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css'].includes(ext)) {
        const stat = fs.statSync(fullPath);
        if (stat.size <= MAX_FILE_SIZE) {
          const relativePath = path.relative(baseDir, fullPath);
          files.push({
            path: `extensions/${relativePath}`,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        }
      }
    }
  }
}
