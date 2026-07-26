import fs from 'fs';
import path from 'path';
import type { ExtensionContext } from './context-loader';
import type { PatchEntry } from './patch';
import { previewPatchApply } from './patch';

interface ManifestRoute {
  slug: string;
  title: string;
}

interface ManifestShape {
  routes?: ManifestRoute[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function quotedNames(prompt: string): string[] {
  const names: string[] = [];
  for (const match of prompt.matchAll(/["“«]([^"”»]+)["”»]/g)) {
    names.push(match[1].trim());
  }
  return names;
}

function readManifestFromContext(context: ExtensionContext): ManifestShape | null {
  const file = context.files.find((f) => f.path.endsWith('/manifest.json') || f.path.endsWith('manifest.json'));
  if (!file) return null;
  try {
    return JSON.parse(file.content) as ManifestShape;
  } catch {
    return null;
  }
}

/**
 * If the user asks to delete a page that is already absent, skip the LLM.
 */
export function detectAlreadyRemovedPage(
  prompt: string,
  context: ExtensionContext,
): string | null {
  if (!/(eliminare|elimina|delete|remove|cancella|rimuovi)/i.test(prompt)) {
    return null;
  }

  const names = quotedNames(prompt);
  if (names.length === 0) return null;

  const manifest = readManifestFromContext(context);
  const routes = manifest?.routes ?? [];
  const code = context.files
    .filter((f) => !f.path.endsWith('manifest.json'))
    .map((f) => f.content)
    .join('\n');

  for (const name of names) {
    const title = name.toLowerCase().trim();
    const slug = slugify(name);
    const inManifest = routes.some(
      (r) =>
        r.slug === slug ||
        r.title.toLowerCase() === title ||
        slugify(r.title) === slug,
    );
    const inCode =
      new RegExp(`slug\\s*===\\s*['"]${slug}['"]`).test(code) ||
      code.includes(`"${slug}"`) ||
      code.includes(`'${slug}'`);

    if (!inManifest && !inCode) {
      return name;
    }
  }

  return null;
}

/**
 * Refuse patches that remove routes the user did not mention.
 */
export function assertSafeManifestEdits(
  prompt: string,
  patches: PatchEntry[],
  repoRoot: string,
): void {
  const promptLower = prompt.toLowerCase();
  const mentioned = new Set(quotedNames(prompt).map((n) => slugify(n)));
  // Also accept raw slug tokens present in the prompt
  for (const token of promptLower.match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? []) {
    mentioned.add(token);
  }

  for (const patch of patches) {
    if (!patch.filePath.endsWith('manifest.json')) continue;

    const fullPath = path.join(repoRoot, patch.filePath);
    if (!fs.existsSync(fullPath)) continue;

    const beforeRaw = fs.readFileSync(fullPath, 'utf-8');
    const afterRaw = previewPatchApply(beforeRaw, patch);
    if (afterRaw == null) continue;

    let before: ManifestShape;
    let after: ManifestShape;
    try {
      before = JSON.parse(beforeRaw) as ManifestShape;
      after = JSON.parse(afterRaw) as ManifestShape;
    } catch {
      continue;
    }

    const beforeRoutes = before.routes ?? [];
    const afterRoutes = after.routes ?? [];
    const removed = beforeRoutes.filter(
      (route) => !afterRoutes.some((r) => r.slug === route.slug),
    );

    for (const route of removed) {
      const ok =
        mentioned.has(route.slug) ||
        mentioned.has(slugify(route.title)) ||
        promptLower.includes(route.slug) ||
        promptLower.includes(route.title.toLowerCase());

      if (!ok) {
        throw new Error(
          `Refusing unsafe change: would remove route "${route.title}" (${route.slug}), which was not mentioned in your request.`,
        );
      }
    }

    if (beforeRoutes.length > 0 && afterRoutes.length === 0 && mentioned.size > 0) {
      const onlyMentionedGone = beforeRoutes.every((route) => {
        return (
          mentioned.has(route.slug) ||
          mentioned.has(slugify(route.title)) ||
          promptLower.includes(route.title.toLowerCase())
        );
      });
      if (!onlyMentionedGone) {
        throw new Error(
          'Refusing unsafe change: patch would remove all extension routes.',
        );
      }
    }
  }
}
