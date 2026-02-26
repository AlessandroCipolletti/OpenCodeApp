import * as path from "path";

/**
 * Paths that are immutable and must never be written to by the coding agent
 * or any extension runtime.
 */
const IMMUTABLE_PREFIXES = [
  "apps/",
  "packages/",
  "docker-compose.yml",
  "package.json",
  "tsconfig.base.json",
  ".env",
];

/**
 * The only path prefix that the coding agent is allowed to write to.
 */
const MUTABLE_PREFIX = "tenants/";

/**
 * The sub-path within a tenant directory that extensions live in.
 */
const EXTENSIONS_SUBPATH = "extensions/";

export interface AccessPolicy {
  /**
   * Returns true if the given repo-relative path is within the
   * modifiable extension sandbox for the given tenant.
   */
  canWrite(tenantId: string, repoRelativePath: string): boolean;

  /**
   * Throws an error if the path is outside the extension sandbox.
   */
  assertCanWrite(tenantId: string, repoRelativePath: string): void;

  /**
   * Returns true if the path is public (readable by extensions via SDK).
   */
  isPublic(repoRelativePath: string): boolean;
}

export function createAccessPolicy(repoRoot: string): AccessPolicy {
  function normalize(p: string): string {
    return path.normalize(p).replace(/\\/g, "/");
  }

  return {
    canWrite(tenantId: string, repoRelativePath: string): boolean {
      const normalized = normalize(repoRelativePath);
      const allowed = `${MUTABLE_PREFIX}${tenantId}/${EXTENSIONS_SUBPATH}`;
      return normalized.startsWith(allowed);
    },

    assertCanWrite(tenantId: string, repoRelativePath: string): void {
      if (!this.canWrite(tenantId, repoRelativePath)) {
        throw new Error(
          `Access denied: "${repoRelativePath}" is outside the allowed ` +
            `extension sandbox "tenants/${tenantId}/extensions/". ` +
            `The coding agent may only modify files within that directory.`
        );
      }
    },

    isPublic(repoRelativePath: string): boolean {
      const normalized = normalize(repoRelativePath);
      return (
        normalized.startsWith("packages/opencodeapp-sdk/") ||
        normalized.startsWith("packages/opencodeapp-ext/")
      );
    },
  };
}

// Singleton instance using CWD as repo root
export const accessPolicy = createAccessPolicy(process.cwd());
