/**
 * Enriches PyTorch for Deep Learning with blocks-based content AND lab
 * cells in one pass, since both are sourced from the same notebook file
 * here (see buildLessonBlocksFromNotebook's docblock in course-import-lib.ts
 * for the full rationale — this repo has no separate README per lesson).
 * Lesson 05 is a plain .md file (no notebook, no lab).
 *
 * Run with: npx ts-node prisma/enrich-pytorch-deep-learning.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import {
  makeRepoHelpers, buildLessonBlocksFromNotebook, buildLessonBlocksFromReadme,
  renderAndSaveLessonBlocks, parseNotebookCells,
} from "./course-import-lib";
import { MODULES } from "./seed-pytorch-deep-learning";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("hassanchamas", "pytorch-deep-learning");

async function main() {
  console.log("🌱  Enriching PyTorch for Deep Learning…\n");
  const course = await prisma.course.findUnique({ where: { slug: "pytorch-deep-learning" } });
  if (!course) throw new Error("Run seed-pytorch-deep-learning.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const l of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: l.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${l.title}`); continue; }

      const raw = await fetchText(l.file);
      if (!raw) { console.warn(`⚠ Could not fetch: ${l.file}`); continue; }

      const isNotebook = l.file.endsWith(".ipynb");
      const blocks = isNotebook
        ? buildLessonBlocksFromNotebook(raw, "", resolveRelativeUrls)
        : buildLessonBlocksFromReadme(raw, "", resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${l.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      if (isNotebook) {
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
  }
  console.log(`\n✅  Enriched ${updated} lessons; ${withLab} with labs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
