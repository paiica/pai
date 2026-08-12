/**
 * Populates Lesson.lab_cells_json with structured, runnable notebook cells for
 * every AI Foundations lesson that has a companion notebook in the source repo.
 * Unlike enrich-ai-foundations.ts (which flattens a notebook into read-only HTML
 * for content_body), this keeps cells as a structured array so the frontend
 * LabPanel can render one Monaco editor + Run button per code cell against a
 * live E2B sandbox, with state persisting between cells like a real Jupyter
 * kernel.
 *
 * Only covers the primary notebook for each lesson (preferring the PyTorch
 * variant when multiple framework variants exist) — one canonical runnable
 * notebook per lesson, matching what the E2B sandbox kernel will actually
 * execute. Lessons with no companion notebook in the source material (pure
 * theory: course setup, intro history, multi-agent systems, AI ethics) are
 * intentionally left out — no lab forced where none exists.
 *
 * Cells referencing local dataset files or huge (~GB) downloads that won't exist
 * in a fresh sandbox are heuristically flagged `runnable: false` with a reason,
 * shown read-only in the UI rather than silently failing when a student hits Run.
 * This heuristic is best-effort — Phase 1 testing (see plan) is expected to
 * surface more cases to flag.
 *
 * Run with: npx ts-node prisma/build-lab-cells-ai-foundations.ts
 * Safe to re-run — overwrites lab_cells_json for the same lessons each time.
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
  // Extended beyond the original 5 Phase 1 lessons — every remaining lesson
  // with a companion notebook found in its own source folder.
  { moduleTitle: "Week II: Symbolic AI", lessonTitle: "Knowledge Representation and Expert Systems", notebookPath: "lessons/2-Symbolic/Animals.ipynb" },
  { moduleTitle: "Week III: Neural Network Foundations", lessonTitle: "Deep Learning Frameworks and Overfitting", notebookPath: "lessons/3-NeuralNetworks/05-Frameworks/IntroPyTorch.ipynb" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Introduction to Computer Vision and OpenCV", notebookPath: "lessons/4-ComputerVision/06-IntroCV/OpenCV.ipynb" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Convolutional Neural Networks & Architectures", notebookPath: "lessons/4-ComputerVision/07-ConvNets/ConvNetsPyTorch.ipynb" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Pre-trained Networks and Transfer Learning", notebookPath: "lessons/4-ComputerVision/08-TransferLearning/TransferLearningPyTorch.ipynb" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Autoencoders and Variational Autoencoders", notebookPath: "lessons/4-ComputerVision/09-Autoencoders/AutoEncodersPyTorch.ipynb" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Generative Adversarial Networks & Style Transfer", notebookPath: "lessons/4-ComputerVision/10-GANs/GANPyTorch.ipynb" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Object Detection", notebookPath: "lessons/4-ComputerVision/11-ObjectDetection/ObjectDetection.ipynb" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Semantic Segmentation and U-Net", notebookPath: "lessons/4-ComputerVision/12-Segmentation/SemanticSegmentationPytorch.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Language Modeling and Custom Embeddings", notebookPath: "lessons/5-NLP/15-LanguageModeling/CBoW-PyTorch.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Recurrent Neural Networks", notebookPath: "lessons/5-NLP/16-RNN/RNNPyTorch.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Generative Recurrent Networks", notebookPath: "lessons/5-NLP/17-GenerativeNetworks/GenerativePyTorch.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Transformers and BERT", notebookPath: "lessons/5-NLP/18-Transformers/TransformersPyTorch.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Named Entity Recognition", notebookPath: "lessons/5-NLP/19-NER/NER-TF.ipynb" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Large Language Models and Prompt Programming", notebookPath: "lessons/5-NLP/20-LangModels/GPT-PyTorch.ipynb" },
  { moduleTitle: "Week VI: Other AI Techniques", lessonTitle: "Deep Reinforcement Learning", notebookPath: "lessons/6-Other/22-DeepRL/CartPole-RL-PyTorch.ipynb" },
  { moduleTitle: "Bonus: Multi-Modal AI", lessonTitle: "Multi-Modal Networks: CLIP and VQGAN", notebookPath: "lessons/X-Extras/X1-MultiModal/Clip.ipynb" },
];

async function main() {
  console.log("🌱  Building lab cells for AI Foundations…\n");

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
      data: { lab_cells_json: cells as unknown as Prisma.InputJsonValue },
    });

    const runnableCount = cells.filter((c) => c.type === "code" && c.runnable !== false).length;
    const codeCount = cells.filter((c) => c.type === "code").length;
    console.log(`✓ ${src.lessonTitle}  (${cells.length} cells, ${runnableCount}/${codeCount} code cells runnable)`);
    updated++;
  }

  console.log(`\n✅  Built lab cells for ${updated}/${phase1.length} lessons.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
