import { Command } from "commander";
import { prisma } from "@opencodeapp/db";
import { AgentOrchestrator } from "@opencodeapp/agent";
import { createProvider, resolveProviderConfig } from "@opencodeapp/llm";
import * as path from "path";

export function registerAgentCommand(program: Command): void {
  program
    .command('agent:run <tenantId> <prompt>')
    .description("Run the coding agent for a tenant with a natural language prompt")
    .action(async (tenantId: string, prompt: string) => {
      const repoRoot = process.env["REPO_ROOT"] ?? path.resolve(__dirname, "../../../../");

      try {
        // Resolve tenant
        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenantId },
          include: { llmSettings: { orderBy: { updatedAt: "desc" }, take: 1 } },
        });

        if (!tenant) {
          console.error(`Tenant "${tenantId}" not found.`);
          process.exit(1);
        }

        const llmSetting = tenant.llmSettings[0] ?? null;
        const config = resolveProviderConfig(llmSetting);
        const llmProvider = createProvider(config);

        const orchestrator = new AgentOrchestrator({
          prisma,
          llmProvider,
          repoRoot,
        });

        console.log(`🤖 Running agent for tenant "${tenantId}"...`);
        console.log(`   Prompt: ${prompt}`);

        const result = await orchestrator.run(tenantId, prompt);

        if (result.status === "done") {
          console.log(
            `✅ Agent run complete. Request ID: ${result.requestId}, patches: ${result.patchCount}`
          );
        } else {
          console.error(`❌ Agent run failed: ${result.error}`);
          process.exit(1);
        }
      } catch (err) {
        console.error("Agent run error:", err);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
