import * as path from "path";

/**
 * Enforces that all agent file writes stay within the allowed extension
 * sandbox: tenants/{tenantId}/extensions/
 *
 * Any attempt to write outside this boundary throws an error, preventing
 * the agent from modifying core framework files.
 */
export class PathGuard {
  private readonly allowedRoot: string;

  constructor(
    private readonly repoRoot: string,
    private readonly tenantId: string
  ) {
    this.allowedRoot = path.resolve(
      repoRoot,
      "tenants",
      tenantId,
      "extensions"
    );
  }

  /**
   * Resolve a path and verify it is within the allowed sandbox.
   * Returns the absolute path if valid.
   * Throws if the path escapes the sandbox (path traversal, symlink, etc.).
   */
  resolve(filePath: string): string {
    // Accept both absolute and relative-to-repoRoot paths
    const abs = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(this.repoRoot, filePath);

    // Use path.relative to detect escape attempts (e.g. path traversal via ..)
    const relative = path.relative(this.allowedRoot, abs);
    const escapes = relative.startsWith("..") || path.isAbsolute(relative);

    if (escapes) {
      throw new Error(
        `PathGuard: write to "${abs}" is not allowed. ` +
          `The agent may only modify files under "${this.allowedRoot}".`
      );
    }

    return abs;
  }

  /**
   * Check without throwing — returns true if the path is inside the sandbox.
   */
  isAllowed(filePath: string): boolean {
    try {
      this.resolve(filePath);
      return true;
    } catch {
      return false;
    }
  }

  get sandboxRoot(): string {
    return this.allowedRoot;
  }
}
