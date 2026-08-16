/**
 * Enriches Introduction to Deep Learning (MIT 6.S191). See
 * seed-introtodeeplearning.ts for the mixed content-shape rationale:
 * "readme-part" lessons pull one `## Part N` section out of a lab's
 * README.md as their blocks source; "notebook" lessons (lab2, no README)
 * use the notebook-as-lesson extractor directly. Every lesson also gets a
 * lab from its paired PT notebook.
 *
 * Run with: npx ts-node prisma/enrich-introtodeeplearning.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromNotebook, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, parseNotebookCells } from "./course-import-lib";
import { MODULES } from "./seed-introtodeeplearning";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("hassanchamas", "introtodeeplearning", undefined, "master");

// Pulls the body of one `## Part N: ...` section out of a README (or, if
// part is null, returns the whole document minus its title line).
function extractPart(readmeMd: string, part: number | null): string {
  if (part === null) return readmeMd.replace(/^#\s+.+$/m, "").trim();
  const re = /^##\s+Part\s+(\d+)[:.]?\s*(.*)$/gm;
  const matches = [...readmeMd.matchAll(re)];
  const idx = matches.findIndex((m) => Number(m[1]) === part);
  if (idx === -1) return "";
  const start = matches[idx].index! + matches[idx][0].length;
  const end = idx + 1 < matches.length ? matches[idx + 1].index! : readmeMd.length;
  const heading = matches[idx][2] || `Part ${part}`;
  return `${heading}\n\n${readmeMd.slice(start, end).trim()}`;
}

async function main() {
  console.log("🌱  Enriching Introduction to Deep Learning…\n");
  const course = await prisma.course.findUnique({ where: { slug: "introtodeeplearning" } });
  if (!course) throw new Error("Run seed-introtodeeplearning.ts first");

  let updated = 0, withLab = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const l of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: l.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${l.title}`); continue; }

      let blocks;
      if (l.kind === "readme-part") {
        const readme = await fetchText(`${l.folder}/README.md`);
        if (!readme) { console.warn(`⚠ No README: ${l.folder}`); continue; }
        const sectionMd = extractPart(readme, l.part);
        blocks = buildLessonBlocksFromReadme(sectionMd, l.folder, resolveRelativeUrls);
      } else {
        const nbRaw = await fetchText(l.notebook);
        if (!nbRaw) { console.warn(`⚠ Could not fetch: ${l.notebook}`); continue; }
        blocks = buildLessonBlocksFromNotebook(nbRaw, "", resolveRelativeUrls);
      }
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${l.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;

      const nbRawForLab = await fetchText(l.notebook);
      if (nbRawForLab) {
        const cells = parseNotebookCells(nbRawForLab);
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
