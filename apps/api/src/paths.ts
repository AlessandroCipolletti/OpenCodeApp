import path from 'path';

/** Nest runs from apps/api, so repo root is two levels up. */
export const REPO_ROOT = path.resolve(process.cwd(), '..', '..');

/**
 * Resolve TENANTS_DIR from env.
 * Relative values (e.g. "tenants") are resolved from the repo root, not apps/api.
 */
export function resolveTenantsDir(): string {
  const configured = process.env.TENANTS_DIR;
  if (!configured) {
    return path.join(REPO_ROOT, 'tenants');
  }
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.resolve(REPO_ROOT, configured);
}
