/**
 * Resolves GitHub cross-reference links in Generative AI for Beginners
 * lesson content to internal navigation. See
 * resolve-github-links-ml-for-beginners.ts for the full rationale. Unlike
 * ML/Data-Science-For-Beginners, this repo's lessons are flat top-level
 * folders (no weekly sectionPath prefix), so folder paths map 1:1 to
 * dirToLesson keys.
 * Run with: npx ts-node prisma/resolve-github-links-generative-ai-for-beginners.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { renderBlockItems, wrapLessonContent } from "../src/modules/content-import/rise-html-blocks";
import { makeRepoHelpers, walkReplaceLinks, resolveLessonTitle } from "./course-import-lib";
import { MODULES } from "./seed-generative-ai-for-beginners";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("hassanchamas", "generative-ai-for-beginners");
const REPO_PREFIX = "https://github.com/hassanchamas/generative-ai-for-beginners/";
const normalize = (p: string) => p.replace(/^\/+|\/+$/g, "");
const toDir = (p: string) => (/\.[a-zA-Z0-9]+$/.test(p) ? p.replace(/\/[^/]+$/, "") : p);

async function main() {
  console.log("🌱  Resolving GitHub cross-reference links…\n");
  const course = await prisma.course.findUnique({ where: { slug: "generative-ai-for-beginners" } });
  if (!course) throw new Error("Run seed-generative-ai-for-beginners.ts first");

  const dirToLesson = new Map<string, { id: string; title: string }>();
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const folder of modDef.folders) {
      const readme = await fetchText(`${folder}/README.md`);
      const title = resolveLessonTitle(readme, folder);
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title } });
      if (lesson) dirToLesson.set(normalize(folder), { id: lesson.id, title });
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
