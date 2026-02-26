import * as fs from "fs";
import * as path from "path";
import type { PrismaClient } from "@prisma/client";

/**
 * Manages agent releases and rollback operations.
 * A "release" is a snapshot of the tenant's extension directory.
 */
export class RollbackManager {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repoRoot: string
  ) {}

  /**
   * Create a new release by snapshotting the current extensions directory.
   */
  async createRelease(
    tenantId: string,
    version: string,
    notes?: string
  ): Promise<string> {
    const release = await this.prisma.agentRelease.create({
      data: { tenantId, version, notes },
    });

    const snapshotDir = path.join(
      this.repoRoot,
      "tenants",
      tenantId,
      "releases",
      release.id
    );

    const extensionsDir = path.join(
      this.repoRoot,
      "tenants",
      tenantId,
      "extensions"
    );

    if (fs.existsSync(extensionsDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
      this.copyDirectory(extensionsDir, snapshotDir);
    }

    return release.id;
  }

  /**
   * Roll back to a previous release by restoring its snapshot.
   */
  async rollback(tenantId: string, releaseId: string): Promise<void> {
    const release = await this.prisma.agentRelease.findUnique({
      where: { id: releaseId },
    });

    if (!release || release.tenantId !== tenantId) {
      throw new Error(
        `Release "${releaseId}" not found for tenant "${tenantId}".`
      );
    }

    const snapshotDir = path.join(
      this.repoRoot,
      "tenants",
      tenantId,
      "releases",
      releaseId
    );

    if (!fs.existsSync(snapshotDir)) {
      throw new Error(
        `Snapshot for release "${releaseId}" not found on disk.`
      );
    }

    const extensionsDir = path.join(
      this.repoRoot,
      "tenants",
      tenantId,
      "extensions"
    );

    // Clear current extensions and restore snapshot
    fs.rmSync(extensionsDir, { recursive: true, force: true });
    fs.mkdirSync(extensionsDir, { recursive: true });
    this.copyDirectory(snapshotDir, extensionsDir);

    // Record the rollback
    await this.prisma.agentRollback.create({
      data: { tenantId, releaseId },
    });
  }

  private copyDirectory(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
