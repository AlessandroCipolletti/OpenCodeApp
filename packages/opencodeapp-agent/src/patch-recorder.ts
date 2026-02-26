import * as fs from "fs";
import * as path from "path";
import type { PrismaClient } from "@prisma/client";

export interface Patch {
  filePath: string;
  patchDiff: string;
  originalContent?: string;
  newContent: string;
}

/**
 * Records every file change the agent makes into the database
 * and on disk so changes can be rolled back.
 */
export class PatchRecorder {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Apply a set of patches to disk and record them in the DB.
   */
  async applyAndRecord(requestId: string, patches: Patch[]): Promise<void> {
    for (const patch of patches) {
      // Ensure the directory exists
      fs.mkdirSync(path.dirname(patch.filePath), { recursive: true });

      // Write the new content
      fs.writeFileSync(patch.filePath, patch.newContent, "utf-8");

      // Record the patch in the database
      await this.prisma.agentChangePatch.create({
        data: {
          requestId,
          filePath: patch.filePath,
          patchDiff: patch.patchDiff,
        },
      });
    }
  }

  /**
   * Get all patches for a given change request.
   */
  async getPatchesForRequest(requestId: string): Promise<
    Array<{ filePath: string; patchDiff: string; appliedAt: Date }>
  > {
    return this.prisma.agentChangePatch.findMany({
      where: { requestId },
      orderBy: { appliedAt: "asc" },
    });
  }
}
