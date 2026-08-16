/**
 * Enriches LangChain for Beginners: blocks from README, lab cells from the
 * `code/` folder's standalone .py files (each becomes one code cell,
 * concatenated in filename order), and assignment sibling lessons. See
 * seed-langchain-for-beginners.ts for the rationale.
 *
 * Run with: npx ts-node prisma/enrich-langchain-for-beginners.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { marked } from "marked";
import {
  makeRepoHelpers, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks,
  resolveLessonTitle, upsertSiblingLesson, flagLabCell, type LabCell,
} from "./course-import-lib";
import { MODULES } from "./seed-langchain-for-beginners";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls, listDir, REPO_BLOB } = makeRepoHelpers("paiica", "langchain-for-beginners");

async function buildLabFromCodeFolder(folder: string): Promise<LabCell[]> {
  const files = await listDir(`${folder}/code`);
  const pyFiles = files.filter((f) => f.endsWith(".py")).sort();
  const cells: LabCell[] = [];
  for (const file of pyFiles) {
    const content = await fetchText(`${folder}/code/${file}`);
    if (!content || !content.trim()) continue;
    cells.push({ type: "markdown", content: `### ${file}` });
    cells.push({ type: "code", content, ...flagLabCell(content) });
  }
  return cells;
}

async function createAssignment(parentLessonId: string, moduleId: string, folder: string, parentTitle: string) {
  const md = await fetchText(`${folder}/assignment.md`);
  if (!md) return;
  const html = resolveRelativeUrls(marked.parse(md) as string, folder);
  const titleMatch = md.match(/^#{1,2}\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(/[`*_]/g, "").trim() : `${parentTitle} — Assignment`;
  const sourceLink = `${REPO_BLOB}/${folder}/assignment.md`;
  const contentBody = [
    `<blockquote><em>Adapted from Microsoft's "LangChain for Beginners" curriculum (MIT License). View the <a href="${sourceLink}" target="_blank" rel="noopener noreferrer">original file</a>.</em></blockquote>`,
    html,
  ].join("\n");
  await upsertSiblingLesson(prisma, moduleId, parentLessonId, title, contentBody);
  console.log(`    ✓ Assignment: "${title}"`);
}

async function main() {
  console.log("🌱  Enriching LangChain for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "langchain-for-beginners" } });
  if (!course) throw new Error("Run seed-langchain-for-beginners.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const folder of modDef.folders) {
      const readme = await fetchText(`${folder}/README.md`);
      if (!readme) { console.warn(`⚠ No README: ${folder}`); continue; }
      const lessonTitle = resolveLessonTitle(readme, folder);
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonTitle}`); continue; }

      const blocks = buildLessonBlocksFromReadme(readme, folder, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonTitle}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      const cells = await buildLabFromCodeFolder(folder);
      if (cells.length) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { lab_cells_json: cells as unknown as Prisma.InputJsonValue } });
        const codeCount = cells.filter((c) => c.type === "code").length;
        const runnableCount = cells.filter((c) => c.type === "code" && c.runnable !== false).length;
        console.log(`    ✓ Lab: ${cells.length} cells, ${runnableCount}/${codeCount} runnable`);
        withLab++;
      }

      if (folder !== "00-course-setup") await createAssignment(lesson.id, mod.id, folder, lessonTitle);
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons; ${withLab} with labs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
