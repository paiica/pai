/**
 * Enriches Rules of ML: fetches the single reference page and saves it
 * as the course's one lesson.
 *
 * Run with: npx ts-node prisma/enrich-rules-of-ml.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { fetchDevsitePageMarkdown } from "./google-devsite-lib";

const prisma = new PrismaClient();
const identity = (html: string) => html;

async function main() {
  console.log("🌱  Enriching Rules of ML…\n");
  const course = await prisma.course.findUnique({ where: { slug: "rules-of-ml" } });
  if (!course) throw new Error("Run seed-rules-of-ml.ts first");

  const lesson = await prisma.lesson.findFirst({ where: { module: { course_id: course.id } } });
  if (!lesson) throw new Error("Lesson not found");

  const md = await fetchDevsitePageMarkdown("/machine-learning/guides/rules-of-ml");
  if (!md) throw new Error("Failed to fetch rules-of-ml page content");

  const blocks = buildLessonBlocksFromReadme(md, "", identity);
  const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
  console.log(`✓ ${lesson.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
  console.log(`\n✅  Done.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
