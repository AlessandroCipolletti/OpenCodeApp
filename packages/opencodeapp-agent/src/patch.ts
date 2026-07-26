import fs from 'fs';
import path from 'path';
import * as Diff from 'diff';
import { validatePatchPaths } from '@opencodeapp/core';

export interface PatchEntry {
  filePath: string;
  patchContent: string;
}

export interface PatchResult {
  success: boolean;
  appliedFiles: string[];
  errors: string[];
}

/**
 * Parses a unified diff string into individual file patches.
 */
export function parseDiff(diffText: string): PatchEntry[] {
  const patches: PatchEntry[] = [];

  // Split on "--- a/" or "diff --git" markers
  const fileChunks = diffText.split(/(?=^--- a\/)/m).filter(Boolean);

  for (const chunk of fileChunks) {
    const match = chunk.match(/^--- a\/(.+)\n\+\+\+ b\/(.+)/m);
    if (!match) continue;
    const filePath = match[2].trim();
    patches.push({ filePath, patchContent: chunk });
  }

  return patches;
}

/**
 * Applies a list of patch entries to the filesystem.
 * All paths must be within the allowed extension directory.
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

  // Validate all paths before applying any
  try {
    validatePatchPaths(patches);
  } catch (err) {
    result.success = false;
    result.errors.push((err as Error).message);
    return result;
  }

  for (const patch of patches) {
    const fullPath = path.join(repoRoot, patch.filePath);

    // Read existing file content (or empty string for new files)
    let originalContent = '';
    if (fs.existsSync(fullPath)) {
      originalContent = fs.readFileSync(fullPath, 'utf-8');
    }

    try {
      const patched = Diff.applyPatch(originalContent, patch.patchContent);
      if (patched === false) {
        // Patch failed to apply - try to create the file with just the + lines
        const newContent = extractAddedLines(patch.patchContent);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        result.appliedFiles.push(patch.filePath);
        console.warn(`[agent] Patch failed for ${patch.filePath}, created from added lines`);
      } else {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, patched, 'utf-8');
        result.appliedFiles.push(patch.filePath);
      }
    } catch (err) {
      result.errors.push(`Failed to apply patch to ${patch.filePath}: ${(err as Error).message}`);
      result.success = false;
    }
  }

  return result;
}

function extractAddedLines(patchContent: string): string {
  const lines = patchContent.split('\n');
  const addedLines = lines
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1));
  return addedLines.join('\n');
}
