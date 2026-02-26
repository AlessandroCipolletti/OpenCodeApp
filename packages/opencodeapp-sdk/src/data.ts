import type { DataSdk, QueryOptions, InsertOptions, SdkContext } from "./types";

/**
 * Creates the data sub-SDK.
 * Extensions may only query/insert into tables prefixed with "ext_".
 */
export function createDataSdk(
  context: SdkContext,
  executeQuery: (sql: string, params: unknown[]) => Promise<unknown[]>,
  executeInsert: (sql: string, params: unknown[]) => Promise<unknown>
): DataSdk {
  function assertExtTable(table: string): void {
    if (!table.startsWith("ext_") && !table.startsWith("ext.")) {
      throw new Error(
        `SDK data access is restricted to tables prefixed with "ext_". Requested: ${table}`
      );
    }
  }

  return {
    async query(table: string, options: QueryOptions = {}): Promise<unknown[]> {
      assertExtTable(table);

      let sql = `SELECT * FROM "${table}"`;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (options.where && Object.keys(options.where).length > 0) {
        const conditions = Object.entries(options.where).map(([col, val]) => {
          params.push(val);
          return `"${col}" = $${paramIndex++}`;
        });
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      if (options.orderBy) {
        const orderClauses = Object.entries(options.orderBy).map(
          ([col, dir]) => {
            // Allow only alphanumeric and underscore column names
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
              throw new Error(`Invalid column name in orderBy: ${col}`);
            }
            return `"${col}" ${dir === "desc" ? "DESC" : "ASC"}`;
          }
        );
        sql += ` ORDER BY ${orderClauses.join(", ")}`;
      }

      if (options.limit !== undefined) {
        const limit = Math.floor(Number(options.limit));
        if (!Number.isFinite(limit) || limit < 0) {
          throw new Error("Invalid limit value");
        }
        sql += ` LIMIT ${limit}`;
      }

      if (options.offset !== undefined) {
        const offset = Math.floor(Number(options.offset));
        if (!Number.isFinite(offset) || offset < 0) {
          throw new Error("Invalid offset value");
        }
        sql += ` OFFSET ${offset}`;
      }

      return executeQuery(sql, params);
    },

    async insert(options: InsertOptions): Promise<unknown> {
      assertExtTable(options.table);

      const columns = Object.keys(options.data);
      const values = Object.values(options.data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

      const sql = `INSERT INTO "${options.table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders}) RETURNING *`;

      return executeInsert(sql, values);
    },
  };
}
