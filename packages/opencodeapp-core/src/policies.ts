const ALLOWED_EXTENSION_PREFIX_RE = /^tenants\/[^/]+\/extensions\//;
const BLOCKED_PATTERNS = [
  /^packages\//,
  /^apps\//,
  /\.\./, // path traversal
  /node_modules/,
];

/**
 * Validates that a file path is within the allowed extension directory.
 * Returns true if the path is safe to modify.
 */
export function isPathAllowed(filePath: string): boolean {
  // Normalize
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Must match extension prefix
  if (!ALLOWED_EXTENSION_PREFIX_RE.test(normalized)) {
    return false;
  }

  // Must not match blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that a SQL migration is safe to run.
 * Extensions must only create/alter tables with ext_ prefix.
 */
export function isSafeMigrationSql(sql: string): { safe: boolean; reason?: string } {
  const upper = sql.trim().toUpperCase();

  // Disallow DROP TABLE on non-ext tables
  const dropTableMatch = upper.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([^\s;(]+)/g);
  if (dropTableMatch) {
    for (const match of dropTableMatch) {
      const tableName = match.replace(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?/i, '').trim();
      if (!tableName.toLowerCase().startsWith('ext_')) {
        return { safe: false, reason: `DROP TABLE on non-extension table: ${tableName}` };
      }
    }
  }

  // Disallow modifications to core tables
  const dangerousPatterns = [
    /ALTER\s+TABLE\s+(?!ext_\w)\w/i,
    /TRUNCATE\s+(?!ext_\w)\w/i,
    /DROP\s+SCHEMA/i,
    /CREATE\s+SCHEMA/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      return { safe: false, reason: `Unsafe SQL pattern detected: ${pattern}` };
    }
  }

  return { safe: true };
}

export function validatePatchPaths(patches: { filePath: string }[]): void {
  for (const patch of patches) {
    if (!isPathAllowed(patch.filePath)) {
      throw new Error(
        `Access denied: cannot modify path "${patch.filePath}". ` +
        `Only paths under tenants/<tenantId>/extensions/ are allowed.`
      );
    }
  }
}
