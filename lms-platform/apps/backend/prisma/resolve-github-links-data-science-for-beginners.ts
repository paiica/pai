/**
 * Resolves GitHub cross-reference links in Data Science for Beginners
 * lesson content to internal navigation. See
 * resolve-github-links-ml-for-beginners.ts for the full rationale.
 * Run with: npx ts-node prisma/resolve-github-links-data-science-for-beginners.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { renderBlockItems, wrapLessonContent } from "../src/modules/content-import/rise-html-blocks";
import { makeRepoHelpers, walkReplaceLinks, stripMarkdownInline } from "./course-import-lib";
import { MODULES } from "./seed-data-science-for-beginners";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("hassanchamas", "Data-Science-For-Beginners");
const REPO_PREFIX = "https://github.com/hassanchamas/Data-Science-For-Beginners/";
const normalize = (p: string) => p.replace(/^\/+|\/+$/g, "");
const toDir = (p: string) => (/\.[a-zA-Z0-9]+$/.test(p) ? p.replace(/\/[^/]+$/, "") : p);

async function main() {
  console.log("🌱  Resolving GitHub cross-reference links…\n");
  const course = await prisma.course.findUnique({ where: { slug: "data-science-for-beginners" } });
  if (!course) throw new Error("Run seed-data-science-for-beginners.ts first");

  const dirToLesson = new Map<string, { id: string; title: string }>();
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const folder of modDef.folders) {
      const lessonPath = `${modDef.sectionPath}/${folder}`;
      const readme = await fetchText(`${lessonPath}/README.md`);
      const titleMatch = readme?.match(/^#\s+(.+)$/m);
      if (!titleMatch) continue;
      const title = stripMarkdownInline(titleMatch[1]);
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title } });
      if (lesson) dirToLesson.set(normalize(lessonPath), { id: lesson.id, title });
    }
  }
  console.log(`Resolved ${dirToLesson.size} lesson folder → lesson mappings.\n`);

  const allLessons = await prisma.lesson.findMany({
    where: { module: { course_id: course.id }, blocks_json: { not: Prisma.JsonNull } },
    select: { id: true, title: true, blocks_json: true },
  });

  let rewrittenLessons = 0, rewrittenLinks = 0;
  for (const lesson of allLessons) {
    const blocksStr = JSON.stringify(lesson.blocks_json);
    if (!blocksStr.includes(REPO_PREFIX)) continue;

    const { value: newBlocks, count } = walkReplaceLinks(lesson.blocks_json, REPO_PREFIX, (rawPath) => {
      const target = dirToLesson.get(toDir(rawPath));
      return target && target.id !== lesson.id ? target.id : null;
    });
    if (!count) continue;

    const flags: string[] = [];
    const { html } = await renderBlockItems(newBlocks, new Map(), async () => "", flags);
    await prisma.lesson.update({ where: { id: lesson.id }, data: { blocks_json: newBlocks as unknown as Prisma.InputJsonValue, content_body: wrapLessonContent(html) } });
    console.log(`✓ ${lesson.title}: rewrote ${count} internal link(s)`);
    rewrittenLessons++;
    rewrittenLinks += count;
  }
  console.log(`\n✅  Rewrote ${rewrittenLinks} link(s) across ${rewrittenLessons} lesson(s).\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
