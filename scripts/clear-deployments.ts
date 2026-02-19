/**
 * Clears all deployment records from the database.
 * Run: npx tsx scripts/clear-deployments.ts
 * Requires DATABASE_URL in .env
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.deployment.deleteMany({});
  console.log(`Deleted ${result.count} deployment(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
