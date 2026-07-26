import fs from 'fs';
import path from 'path';
import * as Diff from 'diff';
import { validatePatchPaths } from '@opencodeapp/core';

export interface PatchEntry {
  filePath: string;
  patchContent: string;
  /** Original chunk from the LLM, used to retry alternate sanitization. */
  rawChunk?: string;
}

export type SanitizeMode = 'force' | 'trust';

export interface PatchResult {
  success: boolean;
  appliedFiles: string[];
  errors: string[];
}

type HunkLine =
  | { type: ' ' | '+' | '-'; text: string }
  | { type: '\\'; text: string };

interface Hunk {
  oldStart: number;
  newStart: number;
  lines: HunkLine[];
}

/**
 * Strip markdown fences and normalize LLM output before parsing.
 */
export function normalizeDiffText(diffText: string): string {
  let text = diffText.trim();
  const fenced = text.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    text = fenced[1].trim();
  }
  return text;
}

/**
 * Parses a unified diff string into individual file patches.
 */
export function parseDiff(diffText: string, tenantSlug?: string): PatchEntry[] {
  const text = normalizeDiffText(diffText);
  const patches: PatchEntry[] = [];
  const fileChunks = text.split(/(?=^diff --git |^--- )/m).filter(Boolean);

  for (const chunk of fileChunks) {
    const match =
      chunk.match(/^\+\+\+ b\/(.+)$/m) ||
      chunk.match(/^\+\+\+ (.+)$/m);
    if (!match) continue;

    let filePath = match[1].trim().replace(/\\/g, '/');
    if (filePath === '/dev/null') continue;

    filePath = normalizeExtensionPath(filePath, tenantSlug);
    patches.push({
      filePath,
      rawChunk: chunk,
      patchContent: sanitizeUnifiedDiff(chunk, filePath, 'trust'),
    });
  }

  return patches;
}

export function normalizeExtensionPath(filePath: string, tenantSlug?: string): string {
  let normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

  if (normalized.startsWith('a/') || normalized.startsWith('b/')) {
    normalized = normalized.slice(2);
  }

  if (tenantSlug) {
    if (normalized.startsWith('extensions/')) {
      normalized = `tenants/${tenantSlug}/${normalized}`;
    } else if (normalized.startsWith(`${tenantSlug}/extensions/`)) {
      normalized = `tenants/${normalized}`;
    } else if (!normalized.startsWith('tenants/') && !normalized.includes('/')) {
      normalized = `tenants/${tenantSlug}/extensions/ui/${normalized}`;
    }
  }

  return normalized;
}

/**
 * Normalize an LLM unified diff into a jsdiff-friendly patch.
 *
 * - trust: keep lines that already look marked (` `, `+`, `-`)
 * - force: assume context lines omitted the marker (common for JSON diffs)
 */
export function sanitizeUnifiedDiff(
  patchContent: string,
  filePath: string,
  mode: SanitizeMode = 'trust',
): string {
  const rawLines = patchContent.replace(/\r\n/g, '\n').split('\n');
  const body: string[] = [];

  for (const line of rawLines) {
    if (line.startsWith('diff --git ') || line.startsWith('index ')) continue;

    if (line.startsWith('--- ')) {
      body.push(`--- a/${filePath}`);
      continue;
    }
    if (line.startsWith('+++ ')) {
      body.push(`+++ b/${filePath}`);
      continue;
    }
    if (line.startsWith('@@')) {
      const hunk = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s@@/);
      body.push(hunk ? hunk[0] : line);
      continue;
    }

    // Ignore git/diff metadata noise from LLMs
    if (/no newline at end of file/i.test(line)) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      body.push(normalizeBlankDiffLine(line));
      continue;
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      body.push(normalizeBlankDiffLine(line));
      continue;
    }
    if (line.startsWith('\\')) {
      continue;
    }

    if (line.trim() === '') {
      body.push(' ');
      continue;
    }

    if (mode === 'trust' && line.startsWith(' ')) {
      // Already has a unified-diff context marker
      body.push(line);
    } else {
      // Missing marker (or force mode): prepend one
      body.push(` ${line}`);
    }
  }

  if (!body.some((l) => l.startsWith('--- '))) body.unshift(`--- a/${filePath}`);
  if (!body.some((l) => l.startsWith('+++ '))) {
    const idx = body.findIndex((l) => l.startsWith('--- '));
    body.splice(idx + 1, 0, `+++ b/${filePath}`);
  }

  return `${recomputeHunkCounts(body).join('\n')}\n`;
}

function recomputeHunkCounts(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith('@@')) {
      out.push(line);
      i += 1;
      continue;
    }

    const headerMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s@@/);
    const oldStart = headerMatch ? Number(headerMatch[1]) : 1;
    const newStart = headerMatch ? Number(headerMatch[2]) : 1;

    i += 1;
    const hunkLines: string[] = [];
    while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('--- ')) {
      hunkLines.push(lines[i]);
      i += 1;
    }

    let oldCount = 0;
    let newCount = 0;
    for (const hl of hunkLines) {
      if (hl.startsWith(' ')) {
        oldCount += 1;
        newCount += 1;
      } else if (hl.startsWith('-')) {
        oldCount += 1;
      } else if (hl.startsWith('+')) {
        newCount += 1;
      }
    }

    // Drop trailing empty/noise lines LLMs often append
    while (hunkLines.length > 0) {
      const last = hunkLines[hunkLines.length - 1];
      if (last === ' ' || last === '+' || last === '-') {
        hunkLines.pop();
        continue;
      }
      break;
    }

    oldCount = 0;
    newCount = 0;
    for (const hl of hunkLines) {
      if (hl.startsWith(' ')) {
        oldCount += 1;
        newCount += 1;
      } else if (hl.startsWith('-')) {
        oldCount += 1;
      } else if (hl.startsWith('+')) {
        newCount += 1;
      }
    }

    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);
    out.push(...hunkLines);
  }

  return out;
}

/** Turn "+   " / "-  " / "   " into true blank diff lines. */
function normalizeBlankDiffLine(line: string): string {
  const marker = line[0];
  const content = line.slice(1);
  if (content.trim() === '') return marker === '+' || marker === '-' ? marker : ' ';
  return line;
}

function parseHunks(patchContent: string): Hunk[] {
  const lines = patchContent.replace(/\r\n/g, '\n').split('\n');
  const hunks: Hunk[] = [];
  let current: Hunk | null = null;

  for (const line of lines) {
    if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('diff ')) {
      continue;
    }

    const header = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s@@/);
    if (header) {
      current = {
        oldStart: Number(header[1]),
        newStart: Number(header[2]),
        lines: [],
      };
      hunks.push(current);
      continue;
    }

    if (!current) continue;

    if (/no newline at end of file/i.test(line)) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      current.lines.push({ type: '+', text: normalizeContent(line.slice(1)) });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      current.lines.push({ type: '-', text: normalizeContent(line.slice(1)) });
    } else if (line.startsWith(' ')) {
      current.lines.push({ type: ' ', text: normalizeContent(line.slice(1)) });
    } else if (line.startsWith('\\')) {
      continue;
    } else if (line === '') {
      current.lines.push({ type: ' ', text: '' });
    } else {
      current.lines.push({ type: ' ', text: normalizeContent(line) });
    }
  }

  for (const hunk of hunks) {
    // Drop trailing blank add/remove/context noise
    while (hunk.lines.length > 0) {
      const last = hunk.lines[hunk.lines.length - 1];
      if (last.text === '') {
        hunk.lines.pop();
        continue;
      }
      break;
    }
  }

  return hunks;
}

function normalizeContent(text: string): string {
  return text.trim() === '' ? '' : text;
}

function linesEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.trim() === '' && b.trim() === '') return true;
  // LLMs often mis-indent lone braces/parens in context lines
  const at = a.trim();
  const bt = b.trim();
  return at === bt && /^[{}();]+$/.test(at);
}

function findSequence(haystack: string[], needle: string[], hintIndex: number): number {
  if (needle.length === 0) return Math.max(0, Math.min(hintIndex, haystack.length));

  const matchesAt = (start: number) => {
    if (start < 0 || start + needle.length > haystack.length) return false;
    for (let i = 0; i < needle.length; i += 1) {
      if (!linesEqual(haystack[start + i], needle[i])) return false;
    }
    return true;
  };

  if (matchesAt(hintIndex)) return hintIndex;

  // Search near the hinted line, then full file
  const maxRadius = Math.max(haystack.length, 50);
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    if (matchesAt(hintIndex - radius)) return hintIndex - radius;
    if (matchesAt(hintIndex + radius)) return hintIndex + radius;
  }
  return -1;
}

/**
 * Apply patch by matching old hunk lines in the file. More tolerant of LLM
 * line-number drift than jsdiff alone.
 */
export function applyPatchManually(originalContent: string, patchContent: string): string | null {
  const sanitized = patchContent.includes('@@')
    ? patchContent
    : patchContent;

  const hunks = parseHunks(sanitized);
  if (hunks.length === 0) return null;

  const endsWithNewline = originalContent.endsWith('\n');
  const result = originalContent.split('\n');
  if (endsWithNewline && result[result.length - 1] === '') {
    result.pop();
  }

  // Apply bottom-up so earlier indexes remain stable
  for (const hunk of [...hunks].reverse()) {
    const oldLines = hunk.lines
      .filter((l): l is { type: ' ' | '-'; text: string } => l.type === ' ' || l.type === '-')
      .map((l) => l.text);

    const idx = findSequence(result, oldLines, Math.max(0, hunk.oldStart - 1));
    if (idx < 0) return null;

    // Keep the file's own context-line indentation; only insert/delete from the patch
    const replacement: string[] = [];
    let oldCursor = 0;
    for (const line of hunk.lines) {
      if (line.type === ' ') {
        replacement.push(result[idx + oldCursor]);
        oldCursor += 1;
      } else if (line.type === '-') {
        oldCursor += 1;
      } else if (line.type === '+') {
        replacement.push(line.text);
      }
    }

    result.splice(idx, oldLines.length, ...replacement);
  }

  return result.join('\n') + (endsWithNewline || originalContent === '' ? '\n' : '');
}

/**
 * Applies a list of patch entries to the filesystem.
 * All-or-nothing: if any patch fails, previously written files are restored.
 */
export function applyPatches(
  patches: PatchEntry[],
  repoRoot: string,
): PatchResult {
  const result: PatchResult = {
    success: true,
    appliedFiles: [],
    errors: [],
  };

  try {
    validatePatchPaths(patches);
  } catch (err) {
    result.success = false;
    result.errors.push((err as Error).message);
    return result;
  }

  const backups = new Map<string, string | null>();

  const restore = () => {
    for (const [fullPath, previous] of backups.entries()) {
      if (previous === null) {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } else {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, previous, 'utf-8');
      }
    }
  };

  for (const patch of patches) {
    const fullPath = path.join(repoRoot, patch.filePath);
    const originalContent = fs.existsSync(fullPath)
      ? fs.readFileSync(fullPath, 'utf-8')
      : null;

    if (!backups.has(fullPath)) {
      backups.set(fullPath, originalContent);
    }

    try {
      const patched = tryApplyPatch(
        originalContent ?? '',
        patch.patchContent,
        patch.rawChunk,
        patch.filePath,
      );
      if (patched == null) {
        throw new Error('Patch did not apply cleanly to current file contents');
      }
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, patched, 'utf-8');
      result.appliedFiles.push(patch.filePath);
      console.log(`[agent] Applied patch to ${patch.filePath}`);
    } catch (err) {
      result.errors.push(`Failed to apply patch to ${patch.filePath}: ${(err as Error).message}`);
      result.success = false;
      restore();
      result.appliedFiles = [];
      console.error(`[agent] Patch apply failed, rolled back: ${(err as Error).message}`);
      return result;
    }
  }

  return result;
}

/** Dry-run a patch against content using the same strategies as apply. */
export function previewPatchApply(
  originalContent: string,
  patch: PatchEntry,
): string | null {
  return tryApplyPatch(
    originalContent,
    patch.patchContent,
    patch.rawChunk,
    patch.filePath,
  );
}

function tryApplyPatch(
  originalContent: string,
  patchContent: string,
  rawChunk?: string,
  filePath?: string,
): string | null {
  const candidates = [patchContent];
  if (rawChunk && filePath) {
    candidates.push(
      sanitizeUnifiedDiff(rawChunk, filePath, 'force'),
      sanitizeUnifiedDiff(rawChunk, filePath, 'trust'),
    );
  }

  for (const candidate of candidates) {
    const manual = applyPatchManually(originalContent, candidate);
    if (manual != null) return manual;

    const viaDiff = Diff.applyPatch(originalContent, candidate, { fuzzFactor: 6 });
    if (viaDiff !== false) return viaDiff;

    const full = tryFullFileRewrite(originalContent, candidate);
    if (full != null) return full;
  }

  // Create-only fallback
  const added = extractAddedLines(patchContent);
  const removed = extractRemovedLines(patchContent);
  if (added.length > 0 && removed.length === 0 && originalContent === '') {
    return added.endsWith('\n') ? added : `${added}\n`;
  }

  return null;
}

/** When the hunk rewrites nearly the whole file, rebuild from +/context lines. */
function tryFullFileRewrite(originalContent: string, patchContent: string): string | null {
  const hunks = parseHunks(patchContent);
  if (hunks.length !== 1) return null;

  const hunk = hunks[0];
  const oldLines = hunk.lines.filter((l) => l.type === ' ' || l.type === '-');
  const fileLines = originalContent.split('\n');
  if (originalContent.endsWith('\n') && fileLines[fileLines.length - 1] === '') {
    fileLines.pop();
  }

  if (!(hunk.oldStart <= 1 && oldLines.length >= Math.max(1, fileLines.length - 2))) {
    return null;
  }

  const next = hunk.lines
    .filter((l) => l.type === ' ' || l.type === '+')
    .map((l) => l.text)
    .join('\n');
  return `${next}\n`;
}

function extractAddedLines(patchContent: string): string {
  return patchContent
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .join('\n');
}

function extractRemovedLines(patchContent: string): string {
  return patchContent
    .split('\n')
    .filter((line) => line.startsWith('-') && !line.startsWith('---'))
    .map((line) => line.slice(1))
    .join('\n');
}
