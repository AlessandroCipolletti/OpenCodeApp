import { PrismaClient } from '@prisma/client';
import { slugToSchemaName } from '../src/helpers';

const prisma = new PrismaClient();

async function main() {
  // Create tenant-1 if it doesn't exist
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'tenant-1' },
    update: {},
    create: {
      slug: 'tenant-1',
      displayName: 'Tenant One',
      schemaName: slugToSchemaName('tenant-1'),
    },
  });
  console.log('Seeded tenant:', tenant.slug);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
