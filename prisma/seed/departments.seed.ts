import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { BYDGOSZCZ_DEPARTMENTS } from './departments.data.js';

/** Idempotent: safe to run on every deploy. */
export async function seedDepartments(prisma: PrismaClient): Promise<void> {
  for (const department of BYDGOSZCZ_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { symbol: department.symbol },
      create: department,
      update: { name: department.name, kind: department.kind, isActive: true },
    });
  }
  console.log(`Seeded ${BYDGOSZCZ_DEPARTMENTS.length} departments`);
}
