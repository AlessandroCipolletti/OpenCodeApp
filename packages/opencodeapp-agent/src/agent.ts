import { createLlmProvider } from '@opencodeapp/llm';
import { getLlmSettings, prisma } from '@opencodeapp/db';
import { loadExtensionContext } from './context-loader';
import { parseDiff, applyPatches } from './patch';
import { createSnapshot } from './snapshot';
import { assertSafeManifestEdits, detectAlreadyRemovedPage } from './request-guards';

export interface AgentRunOptions {
  tenantId: string;
  tenantSlug: string;
  prompt: string;
  repoRoot: string;
  tenantsDir: string;
  /** Decrypted API key (never pass the encrypted DB value). */
  apiKey?: string;
}

export interface AgentRunResult {
  requestId: string;
  success: boolean;
  message: string;
  releaseVersion?: number;
  appliedFiles?: string[];
}

function buildSystemPrompt(tenantSlug: string): string {
  return `You are an AI coding agent for OpenCodeApp.

STRICT RULES:
- You can ONLY modify files under tenants/${tenantSlug}/extensions/.
- If the user request is already satisfied by the current files, respond with exactly: NO_CHANGES_NEEDED
- Otherwise respond with a unified diff patch only (no prose before/after).
- Use paths exactly like: tenants/${tenantSlug}/extensions/ui/...
- Prefer editing existing files: manifest.json and React/TSX/CSS/JSON under the extension.
- To add a new UI page:
  1) Add a route in tenants/${tenantSlug}/extensions/ui/manifest.json (slug + title)
  2) Update the extension React entry (index.tsx) to render that page when the slug matches
- To remove a UI page: delete ONLY that page's route from manifest.json AND ONLY that page's renderer branch from index.tsx.
- Never delete other routes/pages. Never replace the whole extension with return null.
- Do NOT invent unrelated edits. Do NOT remove the generic fallback renderer unless asked.
- Do NOT try to edit apps/ or packages/ (toolbar/core code). Extension routes appear in the app nav automatically from manifest.json.
- Output format example:

--- a/tenants/${tenantSlug}/extensions/ui/manifest.json
+++ b/tenants/${tenantSlug}/extensions/ui/manifest.json
@@ -1,3 +1,4 @@
 ...
`;
}

export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
  const { tenantId, tenantSlug, prompt, repoRoot, tenantsDir, apiKey } = options;

  console.log(`[agent] Starting request for tenant=${tenantSlug}`);
  console.log(`[agent] Prompt: ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}`);

  const changeRequest = await prisma.agentChangeRequest.create({
    data: { tenantId, prompt, status: 'running' },
  });

  try {
    const llmSettings = await getLlmSettings(tenantId);
    const providerName = (llmSettings?.provider as 'mock' | 'openai') ?? 'mock';
    const model = llmSettings?.model ?? 'mock';
    console.log(`[agent] Provider=${providerName} model=${model}`);

    const provider = createLlmProvider({
      provider: providerName,
      model,
      apiKey,
    });

    const context = loadExtensionContext(tenantsDir, tenantSlug);
    console.log(`[agent] Loaded ${context.files.length} extension file(s) as context`);

    const alreadyRemoved = detectAlreadyRemovedPage(prompt, context);
    if (alreadyRemoved) {
      await prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: 'no-changes',
          errorMsg: null,
          completedAt: new Date(),
        },
      });
      console.log(`[agent] Page "${alreadyRemoved}" already absent — skipping LLM`);
      return {
        requestId: changeRequest.id,
        success: true,
        message: `Nothing to change — "${alreadyRemoved}" is already removed.`,
      };
    }

    const contextStr = context.files
      .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    const diffText = await provider.complete({
      messages: [
        { role: 'system', content: buildSystemPrompt(tenantSlug) },
        {
          role: 'user',
          content:
            `Current extension files:\n\n${contextStr}\n\n` +
            `User request: ${prompt}\n\n` +
            `If already done, reply NO_CHANGES_NEEDED. Otherwise return ONLY a unified diff patch under tenants/${tenantSlug}/extensions/.`,
        },
      ],
      maxTokens: 8192,
    });

    console.log(`[agent] LLM response length=${diffText.length}`);
    if (diffText.length < 2000) {
      console.log(`[agent] LLM response preview:\n${diffText}`);
    } else {
      console.log(`[agent] LLM response preview:\n${diffText.slice(0, 1500)}…`);
    }

    if (/^\s*NO_CHANGES_NEEDED\s*$/i.test(diffText.trim())) {
      await prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: 'no-changes',
          errorMsg: null,
          completedAt: new Date(),
        },
      });
      console.log('[agent] Model reported NO_CHANGES_NEEDED');
      return {
        requestId: changeRequest.id,
        success: true,
        message: 'Nothing to change — the current extension already matches your request.',
      };
    }

    const patches = parseDiff(diffText, tenantSlug);
    console.log(`[agent] Parsed ${patches.length} patch(es): ${patches.map(p => p.filePath).join(', ') || '(none)'}`);

    if (patches.length === 0) {
      await prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: 'no-changes',
          errorMsg: 'LLM response contained no parseable unified diff',
          completedAt: new Date(),
        },
      });
      console.warn('[agent] No parseable patches — marking as no-changes');
      return {
        requestId: changeRequest.id,
        success: false,
        message:
          'The model responded, but no valid code patch was produced. Try again with a more specific request about the extension page/manifest.',
      };
    }

    try {
      assertSafeManifestEdits(prompt, patches, repoRoot);
    } catch (err) {
      await prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          status: 'failed',
          errorMsg: (err as Error).message,
          completedAt: new Date(),
        },
      });
      console.error(`[agent] ${(err as Error).message}`);
      return {
        requestId: changeRequest.id,
        success: false,
        message: (err as Error).message,
      };
    }

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
      console.error(`[agent] Patch apply failed: ${patchResult.errors.join(' | ')}`);
      return {
        requestId: changeRequest.id,
        success: false,
        message: patchResult.errors.join('\n'),
      };
    }

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

    const snapshot = await createSnapshot(
      tenantId,
      tenantSlug,
      tenantsDir,
      `Agent: ${prompt.substring(0, 100)}`,
    );

    await prisma.agentChangeRequest.update({
      where: { id: changeRequest.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    console.log(
      `[agent] Success — applied ${patchResult.appliedFiles.length} file(s), release v${snapshot.version}`,
    );

    return {
      requestId: changeRequest.id,
      success: true,
      message: `Applied ${patchResult.appliedFiles.length} file(s)`,
      releaseVersion: snapshot.version,
      appliedFiles: patchResult.appliedFiles,
    };
  } catch (err) {
    console.error(`[agent] Failed: ${(err as Error).message}`);
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
