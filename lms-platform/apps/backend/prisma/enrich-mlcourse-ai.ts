/**
 * Enriches Open Machine Learning Course: aggregates each topic's 1-5
 * notebooks (main + practice/part-N, excluding *_solution.ipynb) into one
 * lesson — markdown cells across all notebooks become the lesson's blocks,
 * code cells become one combined lab. See seed-mlcourse-ai.ts.
 *
 * Run with: npx ts-node prisma/enrich-mlcourse-ai.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, flagLabCell, type LabCell } from "./course-import-lib";
import { MODULES } from "./seed-mlcourse-ai";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls, listDir } = makeRepoHelpers("paiica", "mlcourse.ai");
const BASE = "jupyter_english";

function extractCells(raw: string): { markdown: string[]; code: LabCell[] } {
  let nb: any;
  try { nb = JSON.parse(raw); } catch { return { markdown: [], code: [] }; }
  const markdown: string[] = [];
  const code: LabCell[] = [];
  for (const cell of nb.cells ?? []) {
    const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source ?? "";
    if (!source.trim()) continue;
    if (cell.cell_type === "markdown") markdown.push(source);
    else if (cell.cell_type === "code") code.push({ type: "code", content: source, ...flagLabCell(source) });
  }
  return { markdown, code };
}

async function main() {
  console.log("🌱  Enriching Open Machine Learning Course…\n");
  const course = await prisma.course.findUnique({ where: { slug: "open-machine-learning-course" } });
  if (!course) throw new Error("Run seed-mlcourse-ai.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const { folder, title } of modDef.topics) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${title}`); continue; }

      const files = await listDir(`${BASE}/${folder}`);
      const notebooks = files.filter((f) => f.endsWith(".ipynb") && !/_solution\.ipynb$/i.test(f)).sort();

      const allMarkdown: string[] = [];
      const allCode: LabCell[] = [];
      for (const nb of notebooks) {
        const raw = await fetchText(`${BASE}/${folder}/${nb}`);
        if (!raw) continue;
        const { markdown, code } = extractCells(raw);
        allMarkdown.push(...markdown);
        allCode.push(...code);
      }

      const joined = allMarkdown.join("\n\n");
      const blocks = buildLessonBlocksFromReadme(joined, `${BASE}/${folder}`, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${title}  (${notebooks.length} notebooks, ${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      if (allCode.length) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { lab_cells_json: allCode as unknown as Prisma.InputJsonValue } });
        const runnableCount = allCode.filter((c) => c.runnable !== false).length;
        console.log(`    ✓ Lab: ${allCode.length} cells, ${runnableCount}/${allCode.length} runnable`);
        withLab++;
      }
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons; ${withLab} with labs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
