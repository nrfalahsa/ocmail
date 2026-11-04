// Check inbox count breakdown by userId
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.inbox.count();
  const byUser = await prisma.inbox.groupBy({
    by: ["userId"],
    _count: true,
  });

  console.log(`Total Inboxes: ${total}`);
  console.log("\nBreakdown by userId:");
  for (const row of byUser) {
    console.log(`  userId=${row.userId || "NULL (anonim)"}: ${row._count} inbox(es)`);
  }

  const expiredCount = await prisma.inbox.count({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`\nExpired inboxes (expiresAt < now): ${expiredCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
