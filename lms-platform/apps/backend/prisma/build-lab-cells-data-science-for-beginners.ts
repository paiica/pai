/**
 * Builds runnable lab cells for every Data Science for Beginners lesson
 * with a notebook.ipynb. See build-lab-cells-ml-for-beginners.ts for the
 * rationale (auto-discovery, upstream fallback for empty fork files).
 * Run with: npx ts-node prisma/build-lab-cells-data-science-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, parseNotebookCells, stripMarkdownInline } from "./course-import-lib";
import { MODULES } from "./seed-data-science-for-beginners";

const prisma = new PrismaClient();
const { fetchText, fetchTextWithUpstreamFallback } = makeRepoHelpers("hassanchamas", "Data-Science-For-Beginners", "microsoft");

async function main() {
  console.log("🌱  Building lab cells for Data Science for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "data-science-for-beginners" } });
  if (!course) throw new Error("Run seed-data-science-for-beginners.ts first");

  let withLab = 0, withoutNotebook = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const folder of modDef.folders) {
      const lessonPath = `${modDef.sectionPath}/${folder}`;
      const raw = await fetchTextWithUpstreamFallback(`${lessonPath}/notebook.ipynb`);
      if (!raw) { withoutNotebook++; continue; }

      const readme = await fetchText(`${lessonPath}/README.md`);
      const titleMatch = readme?.match(/^#\s+(.+)$/m);
      const lessonTitle = titleMatch ? stripMarkdownInline(titleMatch[1]) : folder;
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) continue;

      const cells = parseNotebookCells(raw);
      if (!cells.length) { console.warn(`⚠ No cells parsed: ${lessonPath}`); continue; }

      await prisma.lesson.update({ where: { id: lesson.id }, data: { lab_cells_json: cells as unknown as Prisma.InputJsonValue } });
      const codeCount = cells.filter((c) => c.type === "code").length;
      const runnableCount = cells.filter((c) => c.type === "code" && c.runnable !== false).length;
      console.log(`✓ ${lessonTitle}  (${cells.length} cells, ${runnableCount}/${codeCount} runnable)`);
      withLab++;
    }
  }
  console.log(`\n✅  Built labs for ${withLab} lesson(s); ${withoutNotebook} had no notebook.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
