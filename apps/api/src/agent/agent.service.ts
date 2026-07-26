import { Injectable } from '@nestjs/common';
import { runAgent, AgentRunResult } from '@opencodeapp/agent';
import { SettingsService } from '../settings/settings.service';
import { REPO_ROOT, resolveTenantsDir } from '../paths';

const TENANTS_DIR = resolveTenantsDir();

@Injectable()
export class AgentService {
  constructor(private readonly settingsService: SettingsService) {}

  async run(tenantId: string, tenantSlug: string, prompt: string): Promise<AgentRunResult> {
    const apiKey = await this.settingsService.getDecryptedApiKey(tenantId);
    return runAgent({
      tenantId,
      tenantSlug,
      prompt,
      repoRoot: REPO_ROOT,
      tenantsDir: TENANTS_DIR,
      apiKey: apiKey ?? undefined,
    });
  }
}
