/**
 * Enriches Hands-On Artificial Intelligence for Beginners. See
 * seed-hands-on-ai-for-beginners.ts for the per-chapter rationale.
 * Chapters with a notebook use the notebook-as-lesson extractor (their
 * notebooks carry the real narrative — confirmed 12 markdown cells in
 * chapter5 alone, vs. a thin 1-paragraph README); the 5 notebook-less
 * chapters (6, 9, 10, 12, 14) use their README directly, no lab.
 *
 * Run with: npx ts-node prisma/enrich-hands-on-ai-for-beginners.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromNotebook, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, parseNotebookCells } from "./course-import-lib";
import { MODULES } from "./seed-hands-on-ai-for-beginners";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("hassanchamas", "Hands-On-Artificial-Intelligence-for-Beginners", undefined, "master");

async function main() {
  console.log("🌱  Enriching Hands-On Artificial Intelligence for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "hands-on-ai-for-beginners" } });
  if (!course) throw new Error("Run seed-hands-on-ai-for-beginners.ts first");

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
        const readme = await fetchText(`${l.folder}/readme.md`);
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
