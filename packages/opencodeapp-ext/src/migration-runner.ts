import fs from 'fs';
import path from 'path';
import { isSafeMigrationSql } from '@opencodeapp/core';
import { prisma } from '@opencodeapp/db';

export async function runExtensionMigrations(
  extPath: string,
  tenantSchemaName: string,
): Promise<void> {
  const migrationsDir = path.join(extPath, 'db', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const validation = isSafeMigrationSql(sql);
    if (!validation.safe) {
      throw new Error(`Unsafe migration in ${file}: ${validation.reason}`);
    }

    // Run migration - tables should have ext_ prefix
    await prisma.$executeRawUnsafe(sql);
    console.log(`[ext-migration] Applied ${file}`);
  }
}
