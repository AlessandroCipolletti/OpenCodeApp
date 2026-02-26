import * as fs from "fs";
import * as path from "path";
import type { PrismaClient } from "@prisma/client";
import type { LLMProvider } from "@opencodeapp/llm";
import { PathGuard } from "./path-guard";
import { PatchRecorder } from "./patch-recorder";

export interface OrchestratorOptions {
  prisma: PrismaClient;
  llmProvider: LLMProvider;
  repoRoot: string;
}

export interface AgentRunResult {
  requestId: string;
  status: "done" | "failed";
  patchCount: number;
  error?: string;
}

interface FileChange {
  path: string;
  content: string;
}

/**
 * The main agent loop.
 *
 * 1. Creates a change request record in the DB.
 * 2. Reads the current state of the tenant's extension files.
 * 3. Sends a structured prompt to the LLM.
 * 4. Parses the LLM's response for file changes.
 * 5. Validates all paths via PathGuard.
 * 6. Applies changes to disk and records patches via PatchRecorder.
 * 7. Updates the change request status.
 */
export class AgentOrchestrator {
  private readonly patchRecorder: PatchRecorder;

  constructor(private readonly opts: OrchestratorOptions) {
    this.patchRecorder = new PatchRecorder(opts.prisma);
  }

  async run(tenantId: string, prompt: string): Promise<AgentRunResult> {
    // 1. Create the change request
    const changeRequest = await this.opts.prisma.agentChangeRequest.create({
      data: { tenantId, prompt, status: "running" },
    });

    const guard = new PathGuard(this.opts.repoRoot, tenantId);

    try {
      // 2. Read current extension files
      const currentFiles = this.readExtensionFiles(guard.sandboxRoot);

      // 3. Build the LLM prompt
      const systemPrompt = this.buildSystemPrompt(tenantId, guard.sandboxRoot);
      const userPrompt = this.buildUserPrompt(prompt, currentFiles);

      // 4. Call the LLM
      const response = await this.opts.llmProvider.complete({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      });

      // 5. Parse file changes from the LLM response
      const changes = this.parseChanges(response.content, guard);

      // 6. Apply changes
      const patches = changes.map((change) => ({
        filePath: change.path,
        newContent: change.content,
        patchDiff: `--- previous\n+++ current\n${change.content}`,
      }));

      await this.patchRecorder.applyAndRecord(changeRequest.id, patches);

      // 7. Update status
      await this.opts.prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: { status: "done" },
      });

      return { requestId: changeRequest.id, status: "done", patchCount: patches.length };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      await this.opts.prisma.agentChangeRequest.update({
        where: { id: changeRequest.id },
        data: { status: "failed" },
      });

      return { requestId: changeRequest.id, status: "failed", patchCount: 0, error };
    }
  }

  private readExtensionFiles(
    sandboxRoot: string
  ): Array<{ path: string; content: string }> {
    if (!fs.existsSync(sandboxRoot)) return [];

    const result: Array<{ path: string; content: string }> = [];
    this.walkDir(sandboxRoot, sandboxRoot, result);
    return result;
  }

  private walkDir(
    base: string,
    dir: string,
    result: Array<{ path: string; content: string }>
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walkDir(base, abs, result);
      } else {
        const rel = path.relative(base, abs);
        const content = fs.readFileSync(abs, "utf-8");
        result.push({ path: rel, content });
      }
    }
  }

  private buildSystemPrompt(tenantId: string, sandboxRoot: string): string {
    return [
      `You are a coding agent for the OpenCodeApp framework.`,
      `You are working on tenant: ${tenantId}.`,
      `You may ONLY create or modify files inside: ${sandboxRoot}`,
      ``,
      `Respond with file changes in the following JSON format:`,
      `{`,
      `  "changes": [`,
      `    { "path": "relative/path/to/file.ts", "content": "file content here" }`,
      `  ]`,
      `}`,
      ``,
      `Rules:`,
      `- All paths must be relative to the extensions directory.`,
      `- Do not reference or modify any files outside the extensions directory.`,
      `- Extension table names must start with "ext_".`,
      `- Use TypeScript for .ts files.`,
    ].join("\n");
  }

  private buildUserPrompt(
    prompt: string,
    currentFiles: Array<{ path: string; content: string }>
  ): string {
    const fileList =
      currentFiles.length === 0
        ? "(no files yet)"
        : currentFiles
            .map((f) => `--- ${f.path} ---\n${f.content}`)
            .join("\n\n");

    return [
      `Current extension files:\n${fileList}`,
      ``,
      `Task: ${prompt}`,
    ].join("\n");
  }

  private parseChanges(
    llmResponse: string,
    guard: PathGuard
  ): FileChange[] {
    // Try to extract JSON from a fenced code block first, then fallback to raw JSON
    const fencedMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonSource = fencedMatch ? fencedMatch[1] : llmResponse;

    // Find the first complete JSON object containing "changes"
    let parsed: { changes: Array<{ path: string; content: string }> } | null = null;
    const start = jsonSource.indexOf("{");
    if (start !== -1) {
      // Walk from the opening brace to find a balanced closing brace
      let depth = 0;
      let end = -1;
      for (let i = start; i < jsonSource.length; i++) {
        if (jsonSource[i] === "{") depth++;
        else if (jsonSource[i] === "}") {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end !== -1) {
        try {
          const candidate = JSON.parse(jsonSource.slice(start, end + 1)) as unknown;
          if (
            typeof candidate === "object" &&
            candidate !== null &&
            Array.isArray((candidate as Record<string, unknown>)["changes"])
          ) {
            parsed = candidate as typeof parsed;
          }
        } catch {
          // fall through to error below
        }
      }
    }

    if (!parsed) {
      throw new Error("LLM response did not contain a valid JSON changes block.");
    }

    return parsed.changes.map((change) => {
      // Resolve and validate the path
      const absPath = guard.resolve(
        path.join(guard.sandboxRoot, change.path)
      );
      return { path: absPath, content: change.content };
    });
  }
}
