export { PrismaClient } from "@prisma/client";
export type {
  Tenant,
  LlmSetting,
  AgentChangeRequest,
  AgentChangePatch,
  AgentRelease,
  AgentRollback,
  Item,
} from "@prisma/client";

export { TenantSchemaHelper } from "./tenant-schema";
export { ExtensionMigrationRunner } from "./extension-migration-runner";

// Singleton PrismaClient for server-side use
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
