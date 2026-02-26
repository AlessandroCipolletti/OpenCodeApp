import { Injectable } from '@nestjs/common';
import { runAgent, AgentRunResult } from '@opencodeapp/agent';
import path from 'path';

const REPO_ROOT = path.resolve(process.cwd(), '..', '..');
const TENANTS_DIR = process.env.TENANTS_DIR
  ? path.resolve(process.env.TENANTS_DIR)
  : path.join(REPO_ROOT, 'tenants');

@Injectable()
export class AgentService {
  async run(tenantId: string, tenantSlug: string, prompt: string): Promise<AgentRunResult> {
    return runAgent({
      tenantId,
      tenantSlug,
      prompt,
      repoRoot: REPO_ROOT,
      tenantsDir: TENANTS_DIR,
    });
  }
}
