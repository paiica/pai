/**
 * Populates Lesson.lab_cells_json with structured, runnable notebook cells
 * for every ML for Beginners lesson that has a `notebook.ipynb` — unlike
 * AI Foundations' varied per-framework notebook names, this repo's notebooks
 * are consistently named, so the notebook is auto-discovered per lesson
 * (fetch and skip on 404) rather than a hardcoded per-lesson path list.
 *
 * Deliberately does NOT touch `solution/notebook.ipynb` — the lab is the
 * exercise notebook only; the answer key is never surfaced to students.
 *
 * Cell-parsing and NON_RUNNABLE_PATTERNS logic is identical to
 * build-lab-cells-ai-foundations.ts (see that file for rationale) — the
 * confirmed package audit for this repo (numpy/pandas/matplotlib/seaborn/
 * scikit-learn only) means these should all end up Pyodide-eligible via the
 * frontend's existing detectLabRuntime.
 *
 * Run with: npx ts-node prisma/build-lab-cells-ml-for-beginners.ts
 * Safe to re-run — overwrites lab_cells_json for the same lessons each time.
 */

import { config } from "dotenv";
import { resolve as resolvePath } from "path";
config({ path: resolvePath(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/ML-For-Beginners/main";
// A handful of notebooks come back 0 bytes from the fork (a sync/LFS gap,
// confirmed directly — e.g. 2-Regression/1-Tools/notebook.ipynb is 0 bytes
// in the fork but has real content upstream) — fall back to the original
// repo for just those files rather than silently treating the lesson as
// notebook-less.
const UPSTREAM_RAW = "https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main";

type LabCell = { type: "markdown" | "code"; content: string; runnable?: boolean; skip_reason?: string };

const NON_RUNNABLE_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /gzip\.open\(['"]\.\.\//, reason: "Reads a local dataset file from the original repo that isn't available in this sandbox" },
  { pattern: /pd\.read_csv\(['"]\.\.?\//, reason: "Reads a local dataset file from the original repo that isn't available in this sandbox" },
  { pattern: /word2vec-google-news-300/, reason: "Downloads a ~1.6GB pretrained model — too large/slow for an interactive sandbox session" },
  { pattern: /env\.render\(\)/, reason: "Opens a display window, which isn't available in a headless sandbox" },
  { pattern: /cv2\.VideoCapture\(['"]\.\.?\//, reason: "Reads a local video file from the original repo that isn't available in this sandbox" },
];

function flagCell(code: string): { runnable: boolean; skip_reason?: string } {
  for (const { pattern, reason } of NON_RUNNABLE_PATTERNS) {
    if (pattern.test(code)) return { runnable: false, skip_reason: reason };
  }
  return { runnable: true };
}

async function fetchText(path: string): Promise<string | null> {
  const res = await fetch(`${REPO_RAW}/${path}`);
  if (!res.ok) return null;
  return res.text();
}

async function fetchNotebook(path: string): Promise<string | null> {
  const forkText = await fetchText(path);
  if (forkText && forkText.trim().length > 0) return forkText;
  const res = await fetch(`${UPSTREAM_RAW}/${path}`);
  if (!res.ok) return null;
  const upstreamText = await res.text();
  if (upstreamText.trim().length > 0) console.log(`  ↳ fell back to upstream microsoft/ML-For-Beginners for ${path} (fork copy was empty)`);
  return upstreamText.trim().length > 0 ? upstreamText : null;
}

function parseNotebookCells(raw: string): LabCell[] {
  let nb: any;
  try { nb = JSON.parse(raw); } catch { return []; }
  const cells: LabCell[] = [];
  for (const cell of nb.cells ?? []) {
    const source = Array.isArray(cell.source) ? cell.source.join("") : (cell.source ?? "");
    if (!source.trim()) continue;
    if (cell.cell_type === "markdown") {
      cells.push({ type: "markdown", content: source });
    } else if (cell.cell_type === "code") {
      cells.push({ type: "code", content: source, ...flagCell(source) });
    }
  }
  return cells;
}

const MODULES: { title: string; sectionPath: string; folders: string[] }[] = [
  { title: "Week 1: Introduction to Machine Learning", sectionPath: "1-Introduction", folders: ["1-intro-to-ML", "2-history-of-ML", "3-fairness", "4-techniques-of-ML"] },
  { title: "Week 2: Regression", sectionPath: "2-Regression", folders: ["1-Tools", "2-Data", "3-Linear", "4-Logistic"] },
  { title: "Week 3: Build a Web App", sectionPath: "3-Web-App", folders: ["1-Web-App"] },
  { title: "Week 4: Classification", sectionPath: "4-Classification", folders: ["1-Introduction", "2-Classifiers-1", "3-Classifiers-2", "4-Applied"] },
  { title: "Week 5: Clustering", sectionPath: "5-Clustering", folders: ["1-Visualize", "2-K-Means"] },
  { title: "Week 6: Natural Language Processing", sectionPath: "6-NLP", folders: ["1-Introduction-to-NLP", "2-Tasks", "3-Translation-Sentiment", "4-Hotel-Reviews-1", "5-Hotel-Reviews-2"] },
  { title: "Week 7: Time Series Forecasting", sectionPath: "7-TimeSeries", folders: ["1-Introduction", "2-ARIMA", "3-SVR"] },
  { title: "Week 8: Reinforcement Learning", sectionPath: "8-Reinforcement", folders: ["1-QLearning", "2-Gym"] },
  { title: "Week 9: Real-World ML", sectionPath: "9-Real-World", folders: ["1-Applications", "2-Debugging-ML-Models"] },
];

async function main() {
  console.log("🌱  Building lab cells for ML for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "ml-for-beginners" } });
  if (!course) throw new Error("Run seed-ml-for-beginners.ts first");

  let withLab = 0, withoutNotebook = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;

    for (const folder of modDef.folders) {
      const lessonPath = `${modDef.sectionPath}/${folder}`;
      const raw = await fetchNotebook(`${lessonPath}/notebook.ipynb`);
      if (!raw) { withoutNotebook++; continue; }

      const readme = await fetchText(`${lessonPath}/README.md`);
      const titleMatch = readme?.match(/^#\s+(.+)$/m);
      const lessonTitle = titleMatch ? titleMatch[1].replace(/[`*_]/g, "").trim() : folder;
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) { console.warn(`⚠ Lesson not found for notebook: ${lessonPath}`); continue; }

      const cells = parseNotebookCells(raw);
      if (!cells.length) { console.warn(`⚠ No cells parsed: ${lessonPath}`); continue; }

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { lab_cells_json: cells as unknown as Prisma.InputJsonValue },
      });
      const codeCount = cells.filter((c) => c.type === "code").length;
      const runnableCount = cells.filter((c) => c.type === "code" && c.runnable !== false).length;
      console.log(`✓ ${lessonTitle}  (${cells.length} cells, ${runnableCount}/${codeCount} code cells runnable)`);
      withLab++;
    }
  }

  console.log(`\n✅  Built labs for ${withLab} lesson(s); ${withoutNotebook} had no notebook.ipynb (theory-only, correctly skipped).\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
