import fs from 'fs';
import path from 'path';
import { prisma, getNextReleaseVersion } from '@opencodeapp/db';

export interface Snapshot {
  version: number;
  tenantSlug: string;
  files: Record<string, string>;
  createdAt: string;
}

/**
 * Creates a snapshot of the current extension code and saves a release record.
 */
export async function createSnapshot(
  tenantId: string,
  tenantSlug: string,
  tenantsDir: string,
  description?: string,
): Promise<Snapshot> {
  const extDir = path.join(tenantsDir, tenantSlug, 'extensions');
  const files: Record<string, string> = {};

  if (fs.existsSync(extDir)) {
    collectSnapshotFiles(extDir, extDir, files);
  }

  const version = await getNextReleaseVersion(tenantId);

  // Deactivate all previous releases
  await prisma.agentRelease.updateMany({
    where: { tenantId },
    data: { isActive: false },
  });

  // Create new active release
  await prisma.agentRelease.create({
    data: {
      tenantId,
      version,
      description,
      snapshot: files,
      isActive: true,
    },
  });

  return {
    version,
    tenantSlug,
    files,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Restores a release snapshot to disk.
 */
export async function restoreSnapshot(
  releaseId: string,
  tenantId: string,
  tenantSlug: string,
  tenantsDir: string,
  reason?: string,
): Promise<void> {
  const release = await prisma.agentRelease.findUnique({ where: { id: releaseId } });
  if (!release || release.tenantId !== tenantId) {
    throw new Error(`Release ${releaseId} not found for tenant`);
  }

  const files = release.snapshot as Record<string, string>;
  const extDir = path.join(tenantsDir, tenantSlug, 'extensions');

  // Clear existing extension files (except dist/)
  if (fs.existsSync(extDir)) {
    clearDirectory(extDir);
  }

  // Restore files
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(extDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  // Deactivate all, activate restored
  await prisma.agentRelease.updateMany({
    where: { tenantId },
    data: { isActive: false },
  });
  await prisma.agentRelease.update({
    where: { id: releaseId },
    data: { isActive: true },
  });

  // Record rollback
  await prisma.agentRollback.create({
    data: { tenantId, releaseId, reason },
  });
}

function collectSnapshotFiles(
  baseDir: string,
  dir: string,
  files: Record<string, string>,
  depth = 0,
): void {
  if (depth > 5) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist' || entry.name === 'node_modules') continue;
      collectSnapshotFiles(baseDir, fullPath, files, depth + 1);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css'].includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath);
        files[relativePath] = fs.readFileSync(fullPath, 'utf-8');
      }
    }
  }
}

function clearDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist') continue; // keep dist
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}
