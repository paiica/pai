/**
 * Populates Lesson.blocks_json with structured, runnable notebook cells for the
 * Phase 1 "in-browser lab" lessons (see the labs rollout plan). Unlike
 * enrich-ai-foundations.ts (which flattens a notebook into read-only HTML for
 * content_body), this keeps cells as a structured array so the frontend LabPanel
 * can render one Monaco editor + Run button per code cell against a live E2B
 * sandbox, with state persisting between cells like a real Jupyter kernel.
 *
 * Only covers the primary notebook for each Phase 1 lesson (not every framework
 * variant) — one canonical runnable notebook per lesson, matching what the E2B
 * sandbox kernel will actually execute.
 *
 * Cells referencing local dataset files or huge (~GB) downloads that won't exist
 * in a fresh sandbox are heuristically flagged `runnable: false` with a reason,
 * shown read-only in the UI rather than silently failing when a student hits Run.
 * This heuristic is best-effort — Phase 1 testing (see plan) is expected to
 * surface more cases to flag.
 *
 * Run with: npx ts-node prisma/build-lab-cells-ai-foundations.ts
 * Safe to re-run — overwrites blocks_json for the same lessons each time.
 */

import { config } from "dotenv";
import { resolve as resolvePath } from "path";
config({ path: resolvePath(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/AI-For-Beginners/main";

type LabCell = { type: "markdown" | "code"; content: string; runnable?: boolean; skip_reason?: string };

const NON_RUNNABLE_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /gzip\.open\(['"]\.\.\//, reason: "Reads a local dataset file from the original repo that isn't available in this sandbox" },
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
  if (!res.ok) {
    console.warn(`  ⚠ fetch failed (${res.status}): ${path}`);
    return null;
  }
  return res.text();
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

const phase1: { moduleTitle: string; lessonTitle: string; notebookPath: string }[] = [
  { moduleTitle: "Week III: Neural Network Foundations", lessonTitle: "The Perceptron: Your First Neural Network", notebookPath: "lessons/3-NeuralNetworks/03-Perceptron/Perceptron.ipynb" },
  { moduleTitle: "Week III: Neural Network Foundations", lessonTitle: "Building a Neural Network Framework From Scratch", notebookPath: "lessons/3-NeuralNetworks/04-OwnFramework/OwnFramework.ipynb" },
  { moduleTitle: "Week VI: Other AI Techniques", lessonTitle: "Genetic Algorithms", notebookPath: "lessons/6-Other/21-GeneticAlgorithms/Genetic.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Text Representation: Bag of Words and TF-IDF", notebookPath: "lessons/5-NLP/13-TextRep/TextRepresentationPyTorch.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Semantic Word Embeddings: Word2Vec and GloVe", notebookPath: "lessons/5-NLP/14-Embeddings/EmbeddingsPyTorch.ipynb" },
];

async function main() {
  console.log("🌱  Building lab cells (Phase 1) for AI Foundations…\n");

  const course = await prisma.course.findUnique({ where: { slug: "ai-foundations" } });
  if (!course) throw new Error("Run seed-ai-foundations.ts first");

  let updated = 0;
  for (const src of phase1) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: src.lessonTitle, module: { course_id: course.id, title: src.moduleTitle } },
    });
    if (!lesson) {
      console.warn(`⚠ Lesson not found: ${src.moduleTitle} / ${src.lessonTitle}`);
      continue;
    }

    const raw = await fetchText(src.notebookPath);
    if (!raw) continue;
    const cells = parseNotebookCells(raw);
    if (!cells.length) {
      console.warn(`⚠ No cells parsed for: ${src.lessonTitle}`);
      continue;
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { blocks_json: cells as unknown as Prisma.InputJsonValue },
    });

    const runnableCount = cells.filter((c) => c.type === "code" && c.runnable !== false).length;
    const codeCount = cells.filter((c) => c.type === "code").length;
    console.log(`✓ ${src.lessonTitle}  (${cells.length} cells, ${runnableCount}/${codeCount} code cells runnable)`);
    updated++;
  }

  console.log(`\n✅  Built lab cells for ${updated}/${phase1.length} Phase 1 lessons.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
