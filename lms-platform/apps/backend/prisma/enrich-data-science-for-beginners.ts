/**
 * Enriches Data Science for Beginners with blocks-based content (accordion
 * reserved for genuinely optional sections, flashcards for term/definition
 * lists, embedded videos) — see course-import-lib.ts and the
 * enrich-ml-for-beginners.ts docblock for the full rationale.
 *
 * Run with: npx ts-node prisma/enrich-data-science-for-beginners.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { marked } from "marked";
import { makeRepoHelpers, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, upsertSiblingLesson, stripMarkdownInline } from "./course-import-lib";
import { MODULES } from "./seed-data-science-for-beginners";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls, REPO_BLOB } = makeRepoHelpers("hassanchamas", "Data-Science-For-Beginners");

async function createAssignment(parentLessonId: string, moduleId: string, lessonPath: string, parentTitle: string) {
  const md = await fetchText(`${lessonPath}/assignment.md`);
  if (!md) return;
  const html = resolveRelativeUrls(marked.parse(md) as string, lessonPath);
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? stripMarkdownInline(titleMatch[1]) : `${parentTitle} — Assignment`;
  const sourceLink = `${REPO_BLOB}/${lessonPath}/assignment.md`;
  const contentBody = [
    `<blockquote><em>Adapted from the open-source "Data Science For Beginners" curriculum (Microsoft, MIT License). View the <a href="${sourceLink}" target="_blank" rel="noopener noreferrer">original file</a>.</em></blockquote>`,
    html,
  ].join("\n");
  await upsertSiblingLesson(prisma, moduleId, parentLessonId, title, contentBody);
  console.log(`    ✓ Assignment: "${title}"`);
}

async function main() {
  console.log("🌱  Enriching Data Science for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "data-science-for-beginners" } });
  if (!course) throw new Error("Run seed-data-science-for-beginners.ts first");

  let updated = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const folder of modDef.folders) {
      const lessonPath = `${modDef.sectionPath}/${folder}`;
      const readme = await fetchText(`${lessonPath}/README.md`);
      if (!readme) { console.warn(`⚠ No README: ${lessonPath}`); continue; }
      const titleMatch = readme.match(/^#\s+(.+)$/m);
      const lessonTitle = titleMatch ? stripMarkdownInline(titleMatch[1]) : folder;
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonTitle}`); continue; }

      const blocks = buildLessonBlocksFromReadme(readme, lessonPath, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonTitle}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      await createAssignment(lesson.id, mod.id, lessonPath, lessonTitle);
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
