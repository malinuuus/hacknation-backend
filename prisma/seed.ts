import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedDemoCases } from './seed/demo.seed.js';
import { seedDepartments } from './seed/departments.seed.js';

/**
 * `pnpm prisma:seed` loads reference data (departments) and is safe to rerun.
 * `pnpm prisma:seed:demo` also (re)creates a demo user with 10 demo requests.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await seedDepartments(prisma);
    if (process.argv.includes('--demo')) {
      await seedDemoCases(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
