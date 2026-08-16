/**
 * Enriches AI Agents for Beginners with blocks-based content, video embeds,
 * and labs. Same README+notebook pattern as
 * enrich-generative-ai-for-beginners.ts; no assignment.md in this repo, so
 * no assignment-sibling step.
 *
 * Run with: npx ts-node prisma/enrich-ai-agents-for-beginners.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, resolveLessonTitle, parseNotebookCells } from "./course-import-lib";
import { MODULES } from "./seed-ai-agents-for-beginners";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("paiica", "ai-agents-for-beginners");

async function main() {
  console.log("🌱  Enriching AI Agents for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "ai-agents-for-beginners" } });
  if (!course) throw new Error("Run seed-ai-agents-for-beginners.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const { folder, notebook } of modDef.folders) {
      const readme = await fetchText(`${folder}/README.md`);
      if (!readme) { console.warn(`⚠ No README: ${folder}`); continue; }
      const lessonTitle = resolveLessonTitle(readme, folder);
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonTitle}`); continue; }

      const blocks = buildLessonBlocksFromReadme(readme, folder, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonTitle}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      if (notebook) {
        const nbRaw = await fetchText(`${folder}/code_samples/${notebook}`);
        if (nbRaw) {
          const cells = parseNotebookCells(nbRaw);
          if (cells.length) {
            await prisma.lesson.update({ where: { id: lesson.id }, data: { lab_cells_json: cells as unknown as Prisma.InputJsonValue } });
            const codeCount = cells.filter((c) => c.type === "code").length;
            const runnableCount = cells.filter((c) => c.type === "code" && c.runnable !== false).length;
            console.log(`    ✓ Lab: ${cells.length} cells, ${runnableCount}/${codeCount} runnable`);
            withLab++;
          }
        } else {
          console.warn(`  ⚠ Could not fetch notebook: ${folder}/code_samples/${notebook}`);
        }
      }
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons; ${withLab} with labs.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
