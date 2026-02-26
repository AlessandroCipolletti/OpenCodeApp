import { Command } from "commander";
import { prisma } from "@opencodeapp/db";

export function registerTenantCommands(program: Command): void {
  const tenant = program.command("tenant");

  tenant
    .command("create <name>")
    .description("Create a new tenant")
    .action(async (name: string) => {
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      try {
        const existing = await prisma.tenant.findUnique({ where: { slug } });
        if (existing) {
          console.error(`Tenant with slug "${slug}" already exists.`);
          process.exit(1);
        }

        const t = await prisma.tenant.create({
          data: { slug, name },
        });

        console.log(`✅ Tenant created: ${t.name} (slug: ${t.slug}, id: ${t.id})`);
      } catch (err) {
        console.error("Failed to create tenant:", err);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  tenant
    .command("list")
    .description("List all tenants")
    .action(async () => {
      try {
        const tenants = await prisma.tenant.findMany({
          orderBy: { createdAt: "asc" },
        });

        if (tenants.length === 0) {
          console.log("No tenants found.");
          return;
        }

        console.log("\nTenants:");
        console.log("─".repeat(60));
        for (const t of tenants) {
          console.log(`  ${t.slug.padEnd(20)} ${t.name.padEnd(30)} ${t.id}`);
        }
        console.log("─".repeat(60));
      } catch (err) {
        console.error("Failed to list tenants:", err);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
