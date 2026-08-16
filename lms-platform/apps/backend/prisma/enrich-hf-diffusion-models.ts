/**
 * Enriches Hugging Face Diffusion Models Class: "readme" lessons pull
 * their unit's README.md; "notebook" lessons use the notebook-as-lesson
 * extractor and also attach a lab from the same notebook's code cells.
 *
 * Run with: npx ts-node prisma/enrich-hf-diffusion-models.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromReadme, buildLessonBlocksFromNotebook, renderAndSaveLessonBlocks, parseNotebookCells } from "./course-import-lib";
import { MODULES } from "./seed-hf-diffusion-models";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("paiica", "diffusion-models-class", "huggingface");

async function main() {
  console.log("🌱  Enriching Hugging Face Diffusion Models Class…\n");
  const course = await prisma.course.findUnique({ where: { slug: "hf-diffusion-models-class" } });
  if (!course) throw new Error("Run seed-hf-diffusion-models.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) { console.warn(`⚠ Module not found: ${modDef.title}`); continue; }
    for (const lessonDef of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonDef.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonDef.title}`); continue; }

      if (lessonDef.kind === "readme") {
        const readme = await fetchText(`${lessonDef.path}/README.md`);
        if (!readme) { console.warn(`⚠ No README: ${lessonDef.path}`); continue; }
        const blocks = buildLessonBlocksFromReadme(readme, lessonDef.path, resolveRelativeUrls);
        const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
        console.log(`✓ ${lessonDef.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
        updated++;
        continue;
      }

      const nbRaw = await fetchText(`${lessonDef.path}.ipynb`);
      if (!nbRaw) { console.warn(`⚠ Could not fetch: ${lessonDef.path}.ipynb`); continue; }
      const blocks = buildLessonBlocksFromNotebook(nbRaw, lessonDef.path, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonDef.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

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
  console.log(`\n✅  Enriched ${updated} lessons; ${withLab} with labs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
