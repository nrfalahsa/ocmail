// Backfill missing Inbox records from MessageLog.inboxAddr
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dbClient = prisma as unknown as {
    messageLog?: {
      findMany: (args?: { select?: { inboxAddr: boolean } }) => Promise<{ inboxAddr: string }[]>;
    };
  };

  if (!dbClient.messageLog) {
    console.log("MessageLog table not found, skipping backfill");
    return;
  }

  console.log("Fetching unique inbox addresses from MessageLog...");
  const logs = await dbClient.messageLog.findMany({ select: { inboxAddr: true } });
  const uniqueAddrs = [...new Set(logs.map((l) => l.inboxAddr.toLowerCase().trim()))];

  console.log(`Found ${uniqueAddrs.length} unique addresses in MessageLog`);

  let created = 0;
  for (const addr of uniqueAddrs) {
    const existing = await prisma.inbox.findUnique({ where: { address: addr } });
    if (!existing) {
      await prisma.inbox.create({
        data: {
          address: addr,
          prefix: addr.split("@")[0] || "ocm",
          domain: addr.split("@")[1] || "oneclash.biz.id",
          isCustom: false,
          userId: null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      created++;
      console.log(`  Created inbox: ${addr}`);
    }
  }

  console.log(`\nBackfill complete: ${created} inbox(es) created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
