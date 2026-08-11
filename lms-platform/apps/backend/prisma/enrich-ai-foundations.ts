/**
 * Enriches the "AI Foundations" course (seeded by seed-ai-foundations.ts) with the
 * COMPLETE real lesson content from the source curriculum for every lesson folder:
 * README.md, every other .md file (assignment.md, notes, etc.), every notebook
 * variant (PyTorch/TensorFlow/topic notebooks), and the lab/ subfolder (instructions
 * + lab notebook). Execution outputs are dropped from notebooks — only authored
 * markdown + code cells are kept. Every relative image/link path is rewritten to an
 * absolute GitHub URL so images actually render.
 *
 * Requires the `gh` CLI to be authenticated in the shell this runs from (used for
 * directory listings, to avoid GitHub's unauthenticated API rate limit).
 *
 * Run with: npx ts-node prisma/enrich-ai-foundations.ts
 * Safe to re-run — overwrites content_body for the same set of lessons each time.
 */

import { config } from "dotenv";
import { resolve as resolvePath, posix as posixPath } from "path";
config({ path: resolvePath(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { marked } from "marked";
import { execFileSync } from "child_process";

const prisma = new PrismaClient();

const REPO = "hassanchamas/AI-For-Beginners";
const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/AI-For-Beginners/main";
const REPO_BLOB = "https://github.com/hassanchamas/AI-For-Beginners/blob/main";
const REPO_TREE = "https://github.com/hassanchamas/AI-For-Beginners/tree/main";

const EXCLUDE_FILES = new Set(["notebook.ipynb", "tmp.ipynb"]); // scratch files found in source repo, not real lesson content

type Entry = { name: string; type: string };

function listDir(path: string): Entry[] {
  try {
    const out = execFileSync("gh", ["api", `repos/${REPO}/contents/${path}`], { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
    const json = JSON.parse(out);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function fetchText(path: string): Promise<string | null> {
  const res = await fetch(`${REPO_RAW}/${path}`);
  if (!res.ok) {
    console.warn(`    ⚠ fetch failed (${res.status}): ${path}`);
    return null;
  }
  return res.text();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resolveUrl(url: string, baseDir: string, kind: "raw" | "blob"): string {
  if (/^([a-z]+:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("#") || url.startsWith("mailto:")) return url;
  const base = kind === "raw" ? REPO_RAW : REPO_BLOB;
  const normalized = posixPath.normalize(`${baseDir}/${url}`).replace(/^(\.\.\/)+/, "").replace(/^\/+/, "");
  return `${base}/${normalized}`;
}

function resolveRelativeUrls(html: string, baseDir: string): string {
  return html
    .replace(/(<img[^>]+src=")([^"]+)(")/g, (_m, p1, url, p3) => p1 + resolveUrl(url, baseDir, "raw") + p3)
    .replace(/(<a[^>]+href=")([^"]+)(")/g, (_m, p1, url, p3) => p1 + resolveUrl(url, baseDir, "blob") + p3);
}

function renderNotebook(raw: string, baseDir: string): string {
  let nb: any;
  try { nb = JSON.parse(raw); } catch { return ""; }
  const parts: string[] = [];
  for (const cell of nb.cells ?? []) {
    const source = Array.isArray(cell.source) ? cell.source.join("") : (cell.source ?? "");
    if (!source.trim()) continue;
    if (cell.cell_type === "markdown") {
      parts.push(resolveRelativeUrls(marked.parse(source) as string, baseDir));
    } else if (cell.cell_type === "code") {
      parts.push(`<pre class="code-cell"><code class="language-python">${escapeHtml(source)}</code></pre>`);
    }
  }
  return parts.join("\n");
}

async function renderFolder(basePath: string, heading?: string): Promise<string> {
  const entries = listDir(basePath);
  const files = entries.filter((e) => e.type === "file" && (e.name.endsWith(".md") || e.name.endsWith(".ipynb")) && !EXCLUDE_FILES.has(e.name));
  files.sort((a, b) => {
    const rank = (n: string) => (n === "README.md" ? 0 : n.endsWith(".md") ? 1 : 2);
    const ra = rank(a.name), rb = rank(b.name);
    return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
  });

  const parts: string[] = [];
  if (heading) parts.push(`<h2>${heading}</h2>`);

  for (const f of files) {
    const filePath = `${basePath}/${f.name}`;
    if (f.name.endsWith(".md")) {
      const md = await fetchText(filePath);
      if (!md) continue;
      if (f.name !== "README.md") parts.push(`<h3>${f.name.replace(/\.md$/, "").replace(/[-_]/g, " ")}</h3>`);
      parts.push(resolveRelativeUrls(marked.parse(md) as string, basePath));
    } else {
      const nbRaw = await fetchText(filePath);
      if (!nbRaw) continue;
      parts.push(`<h3>Notebook: ${f.name}</h3>`);
      const rendered = renderNotebook(nbRaw, basePath);
      if (rendered) parts.push(rendered);
    }
  }
  return parts.join("\n");
}

type LessonSource = { moduleTitle: string; lessonTitle: string; path: string; isFile?: boolean };

const sources: LessonSource[] = [
  { moduleTitle: "Week 0: Course Setup", lessonTitle: "Setting Up Your AI Development Environment", path: "lessons/0-course-setup/setup.md", isFile: true },
  { moduleTitle: "Week I: Introduction to AI", lessonTitle: "What Is Artificial Intelligence? A Brief History", path: "lessons/1-Intro" },
  { moduleTitle: "Week II: Symbolic AI", lessonTitle: "Knowledge Representation and Expert Systems", path: "lessons/2-Symbolic" },
  { moduleTitle: "Week III: Neural Network Foundations", lessonTitle: "The Perceptron: Your First Neural Network", path: "lessons/3-NeuralNetworks/03-Perceptron" },
  { moduleTitle: "Week III: Neural Network Foundations", lessonTitle: "Building a Neural Network Framework From Scratch", path: "lessons/3-NeuralNetworks/04-OwnFramework" },
  { moduleTitle: "Week III: Neural Network Foundations", lessonTitle: "Deep Learning Frameworks and Overfitting", path: "lessons/3-NeuralNetworks/05-Frameworks" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Introduction to Computer Vision and OpenCV", path: "lessons/4-ComputerVision/06-IntroCV" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Convolutional Neural Networks & Architectures", path: "lessons/4-ComputerVision/07-ConvNets" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Pre-trained Networks and Transfer Learning", path: "lessons/4-ComputerVision/08-TransferLearning" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Autoencoders and Variational Autoencoders", path: "lessons/4-ComputerVision/09-Autoencoders" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Generative Adversarial Networks & Style Transfer", path: "lessons/4-ComputerVision/10-GANs" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Object Detection", path: "lessons/4-ComputerVision/11-ObjectDetection" },
  { moduleTitle: "Week IV: Computer Vision", lessonTitle: "Semantic Segmentation and U-Net", path: "lessons/4-ComputerVision/12-Segmentation" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Text Representation: Bag of Words and TF-IDF", path: "lessons/5-NLP/13-TextRep" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Semantic Word Embeddings: Word2Vec and GloVe", path: "lessons/5-NLP/14-Embeddings" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Language Modeling and Custom Embeddings", path: "lessons/5-NLP/15-LanguageModeling" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Recurrent Neural Networks", path: "lessons/5-NLP/16-RNN" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Generative Recurrent Networks", path: "lessons/5-NLP/17-GenerativeNetworks" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Transformers and BERT", path: "lessons/5-NLP/18-Transformers" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Named Entity Recognition", path: "lessons/5-NLP/19-NER" },
  { moduleTitle: "Week V: Natural Language Processing", lessonTitle: "Large Language Models and Prompt Programming", path: "lessons/5-NLP/20-LangModels" },
  { moduleTitle: "Week VI: Other AI Techniques", lessonTitle: "Genetic Algorithms", path: "lessons/6-Other/21-GeneticAlgorithms" },
  { moduleTitle: "Week VI: Other AI Techniques", lessonTitle: "Deep Reinforcement Learning", path: "lessons/6-Other/22-DeepRL" },
  { moduleTitle: "Week VI: Other AI Techniques", lessonTitle: "Multi-Agent Systems", path: "lessons/6-Other/23-MultiagentSystems" },
  { moduleTitle: "Week VII: AI Ethics", lessonTitle: "AI Ethics and Responsible AI", path: "lessons/7-Ethics" },
  { moduleTitle: "Bonus: Multi-Modal AI", lessonTitle: "Multi-Modal Networks: CLIP and VQGAN", path: "lessons/X-Extras/X1-MultiModal" },
];

async function main() {
  console.log("🌱  Enriching AI Foundations lessons with COMPLETE source content…\n");

  const course = await prisma.course.findUnique({ where: { slug: "ai-foundations" } });
  if (!course) throw new Error("Run seed-ai-foundations.ts first");

  let updated = 0, missing = 0;

  for (const src of sources) {
    const lesson = await prisma.lesson.findFirst({
      where: { title: src.lessonTitle, module: { course_id: course.id, title: src.moduleTitle } },
    });
    if (!lesson) {
      console.warn(`⚠ Lesson not found: ${src.moduleTitle} / ${src.lessonTitle}`);
      missing++;
      continue;
    }

    const parts: string[] = [];
    const sourceLink = src.isFile ? `${REPO_BLOB}/${src.path}` : `${REPO_TREE}/${src.path}`;
    parts.push(`<blockquote><em>Adapted from the open-source "AI For Beginners" curriculum by Dmitry Soshnikov and contributors (Microsoft, MIT License). View the <a href="${sourceLink}" target="_blank" rel="noopener">original source folder</a>.</em></blockquote>`);

    if (src.isFile) {
      const md = await fetchText(src.path);
      if (md) parts.push(resolveRelativeUrls(marked.parse(md) as string, posixPath.dirname(src.path)));
    } else {
      const lessonHtml = await renderFolder(src.path);
      if (lessonHtml) parts.push(lessonHtml);

      const labEntries = listDir(`${src.path}/lab`);
      const hasLab = labEntries.some((e) => e.type === "file");
      if (hasLab) {
        const labHtml = await renderFolder(`${src.path}/lab`, "Hands-On Lab");
        if (labHtml) parts.push(labHtml);
      }
    }

    const html = parts.join("\n");
    await prisma.lesson.update({ where: { id: lesson.id }, data: { content_body: html } });
    console.log(`✓ ${src.lessonTitle}  (${(html.length / 1024).toFixed(1)} KB)`);
    updated++;
  }

  console.log(`\n✅  Enriched ${updated} lessons${missing ? `, ${missing} not found` : ""}.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
