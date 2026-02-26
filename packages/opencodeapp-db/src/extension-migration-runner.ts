import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * SQL keywords / patterns that extensions are NEVER allowed to use.
 * Extensions may only add new tables (prefixed ext_ or in schema ext)
 * and must never touch core tables.
 */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bDROP\s+(TABLE|SCHEMA|DATABASE|INDEX|VIEW|SEQUENCE)\b/i,
  /\bTRUNCATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bCREATE\s+(USER|ROLE)\b/i,
  /\bEXECUTE\b/i,
  /\bCOPY\b/i,
  /\$\$[\s\S]*\$\$/s, // Dollar-quoted blocks (potential code injection)
];

/**
 * Core table names that extensions must never modify.
 */
const CORE_TABLES = new Set([
  "tenants",
  "llm_settings",
  "agent_change_requests",
  "agent_change_patches",
  "agent_releases",
  "agent_rollbacks",
  "items",
]);

export interface MigrationResult {
  file: string;
  success: boolean;
  error?: string;
}

/**
 * Runs SQL migration files from an extension's db/migrations directory.
 * Validates each statement before executing to prevent unsafe operations.
 */
export class ExtensionMigrationRunner {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Validate a SQL string against the forbidden patterns.
   * Throws an error if any forbidden pattern is detected.
   */
  validate(sql: string): void {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(sql)) {
        throw new Error(
          `Forbidden SQL pattern detected: ${pattern.toString()}`
        );
      }
    }

    // Check for references to core tables
    for (const table of CORE_TABLES) {
      const tableRef = new RegExp(`\\b${table}\\b`, "i");
      if (tableRef.test(sql)) {
        throw new Error(
          `Extension SQL must not reference core table: ${table}`
        );
      }
    }

    // For mutating statements, extract the target table name and validate it
    const mutatingOps = [
      { pattern: /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?([^\s"'(;]+)/i, op: "ALTER TABLE" },
      { pattern: /\bDELETE\s+FROM\s+["']?([^\s"'(;]+)/i, op: "DELETE FROM" },
      { pattern: /\bUPDATE\s+["']?([^\s"'(;]+)/i, op: "UPDATE" },
      { pattern: /\bINSERT\s+INTO\s+["']?([^\s"'(;]+)/i, op: "INSERT INTO" },
    ];

    for (const { pattern, op } of mutatingOps) {
      const match = sql.match(pattern);
      if (match) {
        const tableName = match[1].replace(/"/g, "").toLowerCase();
        const isExtPrefixed = tableName.includes("ext_");
        const isExtSchema = tableName.startsWith("ext.");
        if (!isExtPrefixed && !isExtSchema) {
          throw new Error(
            `${op} is only allowed on tables prefixed with "ext_" or in schema "ext". Got: ${tableName}`
          );
        }
      }
    }

    // Extensions must only create tables with ext_ prefix or in ext schema
    const createTableMatch = sql.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([^\s"'(]+)/i
    );
    if (createTableMatch) {
      const tableName = createTableMatch[1].replace(/"/g, "").toLowerCase();
      const isExtPrefixed = tableName.includes("ext_");
      const isExtSchema = tableName.startsWith("ext.");
      if (!isExtPrefixed && !isExtSchema) {
        throw new Error(
          `Extension tables must be prefixed with "ext_" or placed in schema "ext". Got: ${tableName}`
        );
      }
    }
  }

  /**
   * Run a single SQL migration file.
   * Each file should contain a single SQL statement to avoid ambiguous splitting.
   * Multiple statements are supported only when separated by `;\n` on its own line.
   */
  async runFile(filePath: string): Promise<MigrationResult> {
    const file = path.basename(filePath);
    try {
      const sql = fs.readFileSync(filePath, "utf-8").trim();
      if (!sql) {
        return { file, success: true };
      }

      // Validate before executing
      this.validate(sql);

      // Split on semicolons only at end-of-line to reduce false splits inside strings.
      // For safety, extensions should ideally have one statement per file.
      const statements = sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        await this.prisma.$executeRawUnsafe(stmt);
      }

      return { file, success: true };
    } catch (err) {
      return {
        file,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Run all migration files in a directory, in alphabetical order.
   */
  async runDirectory(migrationsDir: string): Promise<MigrationResult[]> {
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const results: MigrationResult[] = [];
    for (const file of files) {
      const result = await this.runFile(path.join(migrationsDir, file));
      results.push(result);
      if (!result.success) {
        // Stop on first failure
        break;
      }
    }

    return results;
  }
}
