/**
 * Enriches Hugging Face NLP Course: fetches each lesson's .mdx page and
 * saves it as blocks.
 *
 * Run with: npx ts-node prisma/enrich-hf-nlp-course.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { MODULES } from "./seed-hf-nlp-course";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("paiica", "course", "huggingface");

async function main() {
  console.log("🌱  Enriching Hugging Face NLP Course…\n");
  const course = await prisma.course.findUnique({ where: { slug: "hf-nlp-course" } });
  if (!course) throw new Error("Run seed-hf-nlp-course.ts first");

  let updated = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) { console.warn(`⚠ Module not found: ${modDef.title}`); continue; }
    for (const lessonDef of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonDef.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonDef.title}`); continue; }

      const md = await fetchText(`chapters/en/${lessonDef.path}.mdx`);
      if (!md) { console.warn(`⚠ Failed to fetch: ${lessonDef.path}`); continue; }

      const blocks = buildLessonBlocksFromReadme(md, lessonDef.path, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonDef.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
