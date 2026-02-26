import { Command } from "commander";
import { prisma } from "@opencodeapp/db";
import { RollbackManager } from "@opencodeapp/agent";
import * as path from "path";

export function registerRollbackCommand(program: Command): void {
  program
    .command("rollback <tenantId> <releaseId>")
    .description("Roll back a tenant's extensions to a previous release")
    .action(async (tenantId: string, releaseId: string) => {
      const repoRoot = process.env["REPO_ROOT"] ?? path.resolve(__dirname, "../../../../");
      const manager = new RollbackManager(prisma, repoRoot);

      try {
        console.log(
          `Rolling back tenant "${tenantId}" to release "${releaseId}"...`
        );
        await manager.rollback(tenantId, releaseId);
        console.log("✅ Rollback complete.");
      } catch (err) {
        console.error("Rollback failed:", err);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
