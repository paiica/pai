/**
 * Enriches the 6 flat-nav Google ML guide courses: fetches each
 * lesson's configured hrefs (google-ml-guides-config.ts) and joins them
 * into the lesson's content.
 *
 * Run with: npx ts-node prisma/enrich-google-ml-guides.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { fetchDevsitePageMarkdown } from "./google-devsite-lib";
import { GUIDE_COURSES } from "./google-ml-guides-config";

const prisma = new PrismaClient();
const identity = (html: string) => html;

async function main() {
  console.log("🌱  Enriching Google ML guide courses…\n");
  for (const def of GUIDE_COURSES) {
    const course = await prisma.course.findUnique({ where: { slug: def.slug } });
    if (!course) { console.warn(`⚠ Course not found: ${def.slug} — run seed-google-ml-guides.ts first`); continue; }
    console.log(`\n— ${def.title} —`);

    for (const lessonDef of def.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module: { course_id: course.id }, title: lessonDef.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonDef.title}`); continue; }

      const pageTexts: string[] = [];
      for (const href of lessonDef.hrefs) {
        const md = await fetchDevsitePageMarkdown(href);
        if (md) pageTexts.push(md);
      }
      const joined = pageTexts.join("\n\n");
      const blocks = buildLessonBlocksFromReadme(joined, "", identity);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`  ✓ ${lessonDef.title}  (${pageTexts.length}/${lessonDef.hrefs.length} pages fetched, ${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
    }
  }
  console.log(`\n✅  Done.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
