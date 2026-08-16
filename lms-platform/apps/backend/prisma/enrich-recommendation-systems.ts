/**
 * Enriches Recommendation Systems: fetches all sub-pages for each unit
 * and concatenates into one lesson document (same pattern as
 * enrich-ml-crash-course.ts).
 *
 * Run with: npx ts-node prisma/enrich-recommendation-systems.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { parseDevsiteNav, fetchNavSourceHtml, fetchDevsitePageMarkdown } from "./google-devsite-lib";

const prisma = new PrismaClient();
const ANCHOR_PAGE = "https://developers.google.com/machine-learning/recommendation/content-based/basics";
const identity = (html: string) => html;

async function main() {
  console.log("🌱  Enriching Recommendation Systems…\n");
  const course = await prisma.course.findUnique({ where: { slug: "recommendation-systems" } });
  if (!course) throw new Error("Run seed-recommendation-systems.ts first");

  const navHtml = await fetchNavSourceHtml(ANCHOR_PAGE);
  const groups = parseDevsiteNav(navHtml);

  let updated = 0;
  for (const group of groups) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: group.heading } });
    if (!mod) { console.warn(`⚠ Module not found: ${group.heading}`); continue; }
    for (const unit of group.units) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: unit.title } });
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
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
