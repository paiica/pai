/**
 * Enriches TensorFlow for Deep Learning with blocks-based content AND lab
 * cells in one pass — same notebook-as-lesson pattern as
 * enrich-pytorch-deep-learning.ts (see that file's docblock).
 *
 * Run with: npx ts-node prisma/enrich-tensorflow-deep-learning.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromNotebook, renderAndSaveLessonBlocks, parseNotebookCells } from "./course-import-lib";
import { MODULES } from "./seed-tensorflow-deep-learning";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("hassanchamas", "tensorflow-deep-learning");

async function main() {
  console.log("🌱  Enriching TensorFlow for Deep Learning…\n");
  const course = await prisma.course.findUnique({ where: { slug: "tensorflow-deep-learning" } });
  if (!course) throw new Error("Run seed-tensorflow-deep-learning.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const l of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: l.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${l.title}`); continue; }

      const raw = await fetchText(l.file);
      if (!raw) { console.warn(`⚠ Could not fetch: ${l.file}`); continue; }

      const blocks = buildLessonBlocksFromNotebook(raw, "", resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${l.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      const cells = parseNotebookCells(raw);
      if (cells.length) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { lab_cells_json: cells as unknown as Prisma.InputJsonValue } });
        const codeCount = cells.filter((c) => c.type === "code").length;
        const runnableCount = cells.filter((c) => c.type === "code" && c.runnable !== false).length;
        console.log(`    ✓ Lab: ${cells.length} cells, ${runnableCount}/${codeCount} runnable`);
        withLab++;
      }
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons; ${withLab} with labs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
