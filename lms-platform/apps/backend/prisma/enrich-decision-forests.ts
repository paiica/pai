/**
 * Enriches Decision Forests: fetches all sub-pages for each of the 8
 * expandable topic groups (via parseDevsiteExpandableUnits) and joins
 * them into the matching lesson.
 *
 * Run with: npx ts-node prisma/enrich-decision-forests.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { parseDevsiteExpandableUnits, fetchNavSourceHtml, fetchDevsitePageMarkdown } from "./google-devsite-lib";

const prisma = new PrismaClient();
const ANCHOR_PAGE = "https://developers.google.com/machine-learning/decision-forests/decision-trees";
const identity = (html: string) => html;

async function main() {
  console.log("🌱  Enriching Decision Forests…\n");
  const course = await prisma.course.findUnique({ where: { slug: "decision-forests" } });
  if (!course) throw new Error("Run seed-decision-forests.ts first");

  const navHtml = await fetchNavSourceHtml(ANCHOR_PAGE);
  const units = parseDevsiteExpandableUnits(navHtml);

  let updated = 0;
  for (const unit of units) {
    const lesson = await prisma.lesson.findFirst({ where: { module: { course_id: course.id }, title: unit.title } });
    if (!lesson) { console.warn(`⚠ Lesson not found: ${unit.title}`); continue; }

    const pageTexts: string[] = [];
    for (const page of unit.pages) {
      const md = await fetchDevsitePageMarkdown(page.href);
      if (md) pageTexts.push(md);
    }
    const joined = pageTexts.join("\n\n");
    const blocks = buildLessonBlocksFromReadme(joined, "", identity);
    const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
    console.log(`✓ ${unit.title}  (${pageTexts.length}/${unit.pages.length} pages fetched, ${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
    updated++;
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
