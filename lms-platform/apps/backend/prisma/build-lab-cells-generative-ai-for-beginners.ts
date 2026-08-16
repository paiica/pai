/**
 * Builds runnable lab cells for Generative AI for Beginners lessons that
 * have a notebook. Unlike ML/Data-Science-For-Beginners (a single canonical
 * notebook.ipynb per lesson), this repo stores notebooks per LLM provider
 * under a `python/` subfolder (confirmed directly via gh api across all 22
 * lesson folders) — e.g. `python/oai-assignment.ipynb`,
 * `python/aoai-assignment.ipynb`, `python/githubmodels-assignment.ipynb`,
 * with inconsistent naming (one lesson has a typo'd `oai-assigment.ipynb`,
 * another nests it under `python/openai/`). We prefer the plain OpenAI
 * ("oai") variant since it needs the fewest Azure-specific setup steps to
 * explain, falling back through the other providers, and finally to a flat
 * notebook at the lesson root (15-rag-and-vector-databases has one).
 *
 * These notebooks all call out to a real OpenAI/Azure API key
 * (os.environ['OPENAI_API_KEY']) which isn't available in this sandbox —
 * course-import-lib.ts's NON_RUNNABLE_PATTERNS now flags those cells with an
 * explanatory skip_reason rather than silently leaving them broken.
 *
 * Run with: npx ts-node prisma/build-lab-cells-generative-ai-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { makeRepoHelpers, parseNotebookCells, resolveLessonTitle } from "./course-import-lib";
import { MODULES } from "./seed-generative-ai-for-beginners";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("hassanchamas", "generative-ai-for-beginners");

const CANDIDATE_PATHS = [
  "python/oai-assignment.ipynb",
  "python/oai-assigment.ipynb",
  "python/openai/oai-assignment.ipynb",
  "python/aoai-assignment.ipynb",
  "python/githubmodels-assignment.ipynb",
  "notebook.ipynb",
  // 19-slm has no assignment-style notebook, just provider demo notebooks.
  "python/phi35-instruct-demo.ipynb",
];

async function findNotebook(folder: string): Promise<string | null> {
  for (const candidate of CANDIDATE_PATHS) {
    const raw = await fetchText(`${folder}/${candidate}`);
    if (raw) return raw;
  }
  // 15-rag-and-vector-databases uses a bespoke flat filename.
  return fetchText(`${folder}/notebook-rag-vector-databases.ipynb`);
}

async function main() {
  console.log("🌱  Building lab cells for Generative AI for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "generative-ai-for-beginners" } });
  if (!course) throw new Error("Run seed-generative-ai-for-beginners.ts first");

  let withLab = 0, withoutNotebook = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const folder of modDef.folders) {
      const raw = await findNotebook(folder);
      if (!raw) { withoutNotebook++; continue; }

      const readme = await fetchText(`${folder}/README.md`);
      const lessonTitle = resolveLessonTitle(readme, folder);
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) continue;

      const cells = parseNotebookCells(raw);
      if (!cells.length) { console.warn(`⚠ No cells parsed: ${folder}`); continue; }

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
