import path from 'path';
import { createLlmProvider } from '@opencodeapp/llm';
import { getLlmSettings, prisma } from '@opencodeapp/db';
import { loadExtensionContext } from './context-loader';
import { parseDiff, applyPatches } from './patch';
import { createSnapshot } from './snapshot';

export interface AgentRunOptions {
  tenantId: string;
  tenantSlug: string;
  prompt: string;
  repoRoot: string;
  tenantsDir: string;
}

export interface AgentRunResult {
  requestId: string;
  success: boolean;
  message: string;
  releaseVersion?: number;
}

const SDK_DOCS = `
You are an AI coding agent for OpenCodeApp.
You can ONLY modify files under tenants/<tenantId>/extensions/.
Generate a unified diff patch to implement the user's request.
Only modify TypeScript/TSX/JavaScript files in the extension folder.
The extension pages are React components.
`;

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const { tenantId, tenantSlug, prompt, repoRoot, tenantsDir } = options;

  // Create change request
  const changeRequest = await prisma.agentChangeRequest.create({
    data: { tenantId, prompt, status: 'running' },
  });

  try {
    // Get LLM settings
    const llmSettings = await getLlmSettings(tenantId);
    const provider = createLlmProvider({
      provider: (llmSettings?.provider as 'mock' | 'openai') ?? 'mock',
      model: llmSettings?.model ?? 'mock',
      apiKey: llmSettings?.apiKeyEnc ?? undefined,
    });

    // Load extension context
    const context = loadExtensionContext(tenantsDir, tenantSlug);
    const contextStr = context.files
      .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    // Call LLM
    const diffText = await provider.complete({
      messages: [
        { role: 'system', content: SDK_DOCS },
        {
          role: 'user',
          content: `Current extension files:\n\n${contextStr}\n\nUser request: ${prompt}\n\nGenerate a unified diff patch:`,
        },
      ],
    });

    // Parse and validate patches
    const patches = parseDiff(diffText);

    if (patches.length === 0) {
      await prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: { status: 'no-changes', completedAt: new Date() },
      });
      return {
        requestId: changeRequest.id,
        success: true,
        message: 'No file changes were generated',
      };
    }

    // Apply patches
    const patchResult = applyPatches(patches, repoRoot);

    if (!patchResult.success) {
      await prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: 'failed',
          errorMsg: patchResult.errors.join('\n'),
          completedAt: new Date(),
        },
      });
      return {
        requestId: changeRequest.id,
        success: false,
        message: patchResult.errors.join('\n'),
      };
    }

    // Save patches to DB
    await Promise.all(
      patches.map(p =>
        prisma.agentChangePatch.create({
          data: {
            changeRequestId: changeRequest.id,
            filePath: p.filePath,
            patchContent: p.patchContent,
            appliedAt: new Date(),
          },
        }),
      ),
    );

    // Create snapshot/release
    const snapshot = await createSnapshot(
      tenantId,
      tenantSlug,
      tenantsDir,
      `Agent: ${prompt.substring(0, 100)}`,
    );

    // Complete request
    await prisma.agentChangeRequest.update({
      where: { id: changeRequest.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    return {
      requestId: changeRequest.id,
      success: true,
      message: `Applied ${patchResult.appliedFiles.length} file(s)`,
      releaseVersion: snapshot.version,
    };
  } catch (err) {
    await prisma.agentChangeRequest.update({
      where: { id: changeRequest.id },
      data: {
        status: 'failed',
        errorMsg: (err as Error).message,
        completedAt: new Date(),
      },
    });
    throw err;
  }
}
