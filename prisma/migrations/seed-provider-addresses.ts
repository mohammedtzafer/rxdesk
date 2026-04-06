import { PrismaClient } from "../../src/generated/prisma/client";

const db = new PrismaClient();

async function main() {
  const providers = await db.provider.findMany({
    where: {
      practiceAddress: { not: null },
    },
    select: {
      id: true,
      organizationId: true,
      practiceAddress: true,
      practiceCity: true,
      practiceState: true,
      practiceZip: true,
    },
  });

  let created = 0;
  for (const p of providers) {
    if (!p.practiceAddress) continue;

    const existing = await db.providerAddress.findFirst({
      where: {
        providerId: p.id,
        address: p.practiceAddress,
      },
    });

    if (!existing) {
      await db.providerAddress.create({
        data: {
          providerId: p.id,
          organizationId: p.organizationId,
          address: p.practiceAddress,
          city: p.practiceCity,
          state: p.practiceState,
          zip: p.practiceZip,
          isPrimary: true,
          source: "manual",
        },
      });
      created++;
    }
  }

  console.log(`Created ${created} provider address records from existing data`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
