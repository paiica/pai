/**
 * Enriches Practical Deep Learning. See seed-practical-dl.ts for the
 * per-week notebook-selection rationale. Notebook lessons use the
 * notebook-as-lesson extractor + a paired lab; week11_diffusion (no
 * notebook in this repo) uses its README directly with no lab.
 *
 * Run with: npx ts-node prisma/enrich-practical-dl.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromNotebook, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, parseNotebookCells } from "./course-import-lib";
import { MODULES } from "./seed-practical-dl";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("hassanchamas", "Practical_DL", undefined, "fall25");

async function main() {
  console.log("🌱  Enriching Practical Deep Learning…\n");
  const course = await prisma.course.findUnique({ where: { slug: "practical-deep-learning" } });
  if (!course) throw new Error("Run seed-practical-dl.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const l of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: l.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${l.title}`); continue; }

      let blocks;
      let nbRaw: string | null = null;
      if (l.notebook) {
        nbRaw = await fetchText(`${l.folder}/${l.notebook}`);
        if (!nbRaw) { console.warn(`⚠ Could not fetch: ${l.folder}/${l.notebook}`); continue; }
        blocks = buildLessonBlocksFromNotebook(nbRaw, l.folder, resolveRelativeUrls);
      } else {
        const readme = await fetchText(`${l.folder}/README.md`);
        if (!readme) { console.warn(`⚠ No README: ${l.folder}`); continue; }
        blocks = buildLessonBlocksFromReadme(readme, l.folder, resolveRelativeUrls);
      }
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${l.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      if (nbRaw) {
        const cells = parseNotebookCells(nbRaw);
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
