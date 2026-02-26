import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@opencodeapp/db";
import { AgentOrchestrator } from "@opencodeapp/agent";
import { createProvider, resolveProviderConfig } from "@opencodeapp/llm";
import * as path from "path";

export interface RunAgentDto {
  prompt: string;
}

@Injectable()
export class AgentService {
  private readonly repoRoot: string;

  constructor() {
    this.repoRoot = process.env["REPO_ROOT"] ?? path.resolve(__dirname, "../../../../");
  }

  async run(tenantId: string, prompt: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantId },
      include: {
        llmSettings: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" not found`);
    }

    const llmSetting = tenant.llmSettings[0] ?? null;
    const config = resolveProviderConfig(llmSetting);
    const llmProvider = createProvider(config);

    const orchestrator = new AgentOrchestrator({
      prisma,
      llmProvider,
      repoRoot: this.repoRoot,
    });

    return orchestrator.run(tenantId, prompt);
  }

  async getRequests(tenantId: string) {
    return prisma.agentChangeRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getReleases(tenantId: string) {
    return prisma.agentRelease.findMany({
      where: { tenantId },
      orderBy: { releasedAt: "desc" },
    });
  }
}
