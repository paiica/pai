/**
 * Enriches Computer Vision: for each unit-lesson, fetches all of that
 * unit's `.mdx` sub-pages (in toctree order) and concatenates them into
 * one markdown document before running the standard blocks transform. See
 * seed-computer-vision-course.ts for the unit-aggregation rationale.
 *
 * Run with: npx ts-node prisma/enrich-computer-vision-course.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { fetchToctree, MODULES } from "./seed-computer-vision-course";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("paiica", "computer-vision-course");

function cleanTitle(unitTitle: string): string {
  return unitTitle.replace(/^Unit\s+\d+\s*-\s*/, "").trim();
}

async function main() {
  console.log("🌱  Enriching Computer Vision…\n");
  const course = await prisma.course.findUnique({ where: { slug: "computer-vision" } });
  if (!course) throw new Error("Run seed-computer-vision-course.ts first");

  const units = await fetchToctree();
  let updated = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const unitTitle of modDef.unitTitles) {
      const unit = units.find((u) => u.title === unitTitle);
      if (!unit) continue;
      const title = cleanTitle(unit.title);
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${title}`); continue; }

      const pageTexts: string[] = [];
      for (const page of unit.pages) {
        if (!page.local) continue;
        const md = await fetchText(`chapters/en/${page.local}.mdx`);
        if (md) pageTexts.push(md);
      }
      const joined = pageTexts.join("\n\n");
      const blocks = buildLessonBlocksFromReadme(joined, `chapters/en`, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${title}  (${pageTexts.length}/${unit.pages.length} pages fetched, ${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
