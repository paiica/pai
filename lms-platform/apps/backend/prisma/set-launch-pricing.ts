/**
 * One-time Launch Pricing rollout: sets every real course's price to $40
 * with a $199 "was" price shown crossed out on course cards (Launch
 * Pricing — Available for a Limited Time). Skips the "test" course (leftover
 * debug data, not real content).
 *
 * Run with: npx ts-node prisma/set-launch-pricing.ts
 * Safe to re-run — idempotent (same values every time).
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    where: { slug: { not: "test" } },
    select: { id: true, title: true, slug: true, price: true },
  });

  console.log(`Applying Launch Pricing ($199 → $40) to ${courses.length} course(s)...\n`);
  for (const c of courses) {
    await prisma.course.update({
      where: { id: c.id },
      data: { price: 40.0, compare_at_price: 199.0 },
    });
    console.log(`✓ ${c.title} (was $${c.price})`);
  }
  console.log(`\n✅ Done.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
