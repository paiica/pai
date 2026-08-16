/**
 * Shared logic for importing external GitHub curricula as PAII courses —
 * extracted from the ML-For-Beginners pipeline (seed/enrich/build-lab-cells/
 * resolve-github-links) so each subsequent course only needs a small driver
 * script supplying repo-specific config, not a full copy-paste of this logic.
 *
 * Key lesson learned building the ML-For-Beginners pilot (see its git
 * history): accordion is for genuinely OPTIONAL material a student can skip
 * — not the lesson's core sequential content. An early version put every
 * section behind an accordion toggle, which hid the actual teaching content
 * behind clicks. isSupplementaryHeading() below is the fix — only sections
 * matching known-optional patterns (Challenge, Review & Self Study) become
 * accordion items; everything else renders as normal flowing text with a
 * heading, like a real lesson page.
 */

import { posix as posixPath } from "path";
import { marked } from "marked";
import { renderBlockItems, wrapLessonContent } from "../src/modules/content-import/rise-html-blocks";
import { PrismaClient, Prisma } from "@prisma/client";

export type Block = Record<string, any>;
export type LabCell = { type: "markdown" | "code"; content: string; runnable?: boolean; skip_reason?: string };

export const NON_RUNNABLE_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /gzip\.open\(['"]\.\.\//, reason: "Reads a local dataset file from the original repo that isn't available in this sandbox" },
  { pattern: /pd\.read_csv\(['"]\.\.?\//, reason: "Reads a local dataset file from the original repo that isn't available in this sandbox" },
  { pattern: /word2vec-google-news-300/, reason: "Downloads a ~1.6GB pretrained model — too large/slow for an interactive sandbox session" },
  { pattern: /env\.render\(\)/, reason: "Opens a display window, which isn't available in a headless sandbox" },
  { pattern: /cv2\.VideoCapture\(['"]\.\.?\//, reason: "Reads a local video file from the original repo that isn't available in this sandbox" },
  { pattern: /torch\.cuda\.|\.to\(['"]cuda['"]\)|\.cuda\(\)/, reason: "Requires a GPU, which isn't available in this sandbox" },
  { pattern: /os\.environ\[['"](OPENAI_API_KEY|AZURE_OPENAI_[A-Z_]+|GITHUB_TOKEN)['"]\]|openai\.api_key\s*=|\bOpenAI\s*\(|\bAzureOpenAI\s*\(|\bChatCompletion\.create\(|\bMistralClient\s*\(/, reason: "Requires a paid API key (OpenAI/Azure OpenAI/Mistral) that isn't configured in this sandbox" },
  // The lab sandbox executes code as a single one-shot runCode() call with
  // no stdin channel (confirmed: labs.service.ts's executeCell just calls
  // sandbox.runCode(code), nothing pipes input) — input() has nothing to
  // read and raises EOFError immediately rather than prompting the
  // student, in every course, not just this one.
  { pattern: /\binput\s*\(/, reason: "This sandbox has no interactive input — input() has nothing to read from and will error. Edit the variable's value directly instead." },
];

export function makeRepoHelpers(owner: string, repo: string, upstreamOwner?: string, branch: string = "main") {
  const REPO_RAW = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
  const REPO_BLOB = `https://github.com/${owner}/${repo}/blob/${branch}`;
  const UPSTREAM_RAW = upstreamOwner ? `https://raw.githubusercontent.com/${upstreamOwner}/${repo}/${branch}` : null;

  async function fetchText(path: string): Promise<string | null> {
    const res = await fetch(`${REPO_RAW}/${path}`);
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  }

  // Falls back to the upstream original repo for files that come back empty
  // from the fork (a confirmed real gap for at least one file in
  // ML-For-Beginners — see build-lab-cells-ml-for-beginners.ts).
  async function fetchTextWithUpstreamFallback(path: string): Promise<string | null> {
    const forkText = await fetchText(path);
    if (forkText && forkText.trim().length > 0) return forkText;
    if (!UPSTREAM_RAW) return forkText;
    const res = await fetch(`${UPSTREAM_RAW}/${path}`);
    if (!res.ok) return null;
    const upstreamText = await res.text();
    return upstreamText.trim().length > 0 ? upstreamText : null;
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

  // Lists filenames in a repo directory via the GitHub contents API (raw.
  // githubusercontent.com only serves individual file content, not
  // directory listings).
  async function listDir(path: string): Promise<string[]> {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers: { "User-Agent": "paii-course-import" } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((f: any) => f.type === "file").map((f: any) => f.name) : [];
  }

  return { REPO_RAW, REPO_BLOB, fetchText, fetchTextWithUpstreamFallback, resolveUrl, resolveRelativeUrls, listDir };
}

export function stripMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

// Strips leading emoji/pictographs some repos prefix their headings with
// (confirmed: mcp-for-beginners has titles like "🚀 MCP Tooling") — fine in
// a GitHub README, out of place as a course lesson title.
function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}‍️\s]+/u, "").trim();
}

// Not every lesson README leads with a real `# Title` — some (confirmed:
// generative-ai-for-beginners) start with a thumbnail/video link and jump
// straight to `## Introduction`, so a bare `/^#\s+.../m` match can land on an
// unrelated single-`#` line buried deep in the body (a code-example caption,
// not a title). Only trust an H1 match near the top of the document (first
// 400 chars). Some repos (confirmed: mcp-for-beginners/03-GettingStarted)
// use `##` for their chapter title instead of `#` — tried as a second
// fallback before giving up and title-casing the folder name.
export function resolveLessonTitle(markdown: string | null, folder: string): string {
  const fallback = () => {
    const titled = folder.replace(/^\d+[-_.]?/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return titled.replace(/\bAi\b/g, "AI").replace(/\bAi(?=[A-Z])/g, "AI");
  };
  if (!markdown) return fallback();
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1 && h1.index !== undefined && h1.index < 400) return stripLeadingEmoji(stripMarkdownInline(h1[1]));
  const h2 = markdown.match(/^##\s+(.+)$/m);
  if (h2 && h2.index !== undefined && h2.index < 400) return stripLeadingEmoji(stripMarkdownInline(h2[1]));
  return fallback();
}

// Notebook-sourced titles (see buildLessonBlocksFromNotebook below): these
// notebooks reliably open with a real `# Title` heading, but often after a
// pure Colab-badge markdown cell with no real text — which can push the
// title past resolveLessonTitle's 400-char "near the top" cutoff. Search
// unbounded for the first H1 instead; fall back to the folder/file name.
export function resolveNotebookLessonTitle(notebookRaw: string | null, folder: string): string {
  const fallback = () => folder.replace(/^\d+[-_.]?/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (!notebookRaw) return fallback();
  let nb: any;
  try { nb = JSON.parse(notebookRaw); } catch { return fallback(); }
  // Some notebooks (confirmed: MIT 6.S191 introtodeeplearning) tack a
  // "# Copyright Information" heading onto the first (badge/table) markdown
  // cell — a false positive that isn't the real lesson title, which is
  // reliably the next H1 after it. Skip known-boilerplate headings.
  const boilerplate = /^(copyright information|license|table of contents)$/i;
  for (const cell of nb.cells ?? []) {
    if (cell.cell_type !== "markdown") continue;
    const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source ?? "";
    for (const match of source.matchAll(/^#\s+(.+)$/gm)) {
      const title = stripMarkdownInline(match[1]);
      if (!boilerplate.test(title)) return title;
    }
  }
  return fallback();
}

export function isSupplementaryHeading(heading: string): boolean {
  const h = heading.toLowerCase();
  return /challenge/.test(h) || /review\s*&?\s*self.?study/.test(h) || h.trim() === "review" || /further reading/.test(h) || /additional resources/.test(h);
}

export function isQuizStubHeading(heading: string): boolean {
  return /pre-lecture quiz|post-lecture quiz|pre[- ]quiz|post[- ]quiz/i.test(heading);
}

export function extractVideosAndStrip(md: string): { videoIds: string[]; text: string } {
  const videoIds: string[] = [];
  const seen = new Set<string>();
  const thumbLinkRe = /\[!\[[^\]]*\]\([^)]*\)\]\((https?:\/\/(?:www\.)?youtu(?:\.be\/|be\.com\/watch\?v=)([a-zA-Z0-9_-]{6,})[^)\s]*)[^)]*\)/g;
  let text = md.replace(thumbLinkRe, (_m, _url, id) => {
    if (!seen.has(id)) { seen.add(id); videoIds.push(id); }
    return "";
  });
  const bareLinkRe = /https?:\/\/(?:www\.)?youtu(?:\.be\/|be\.com\/watch\?v=)([a-zA-Z0-9_-]{6,})/g;
  text = text.replace(bareLinkRe, (_m, id) => {
    if (!seen.has(id)) { seen.add(id); videoIds.push(id); }
    return "";
  });
  return { videoIds, text };
}

// `**Bold**: description` bullet lists are structurally identical whether
// they're a real glossary (good flashcard material) or a lesson index /
// course syllabus outline (confirmed real misfires this session: MCP for
// Beginners's "This section consists of several lessons: **1 Your first
// server**, in this lesson..." became broken flashcards with back text
// starting mid-sentence with a comma; Computer Vision's "Course Structure"
// unit-by-unit outline became flashcards titled "Unit 1 - Fundamentals").
// These signals catch both patterns.
function looksLikeNavOrTocItem(front: string, back: string): boolean {
  if (/^[,;]/.test(back)) return true; // back starts mid-sentence, not a definition
  if (/^\d/.test(front)) return true; // "1 Your first server" — a list index, not a term
  if (/^(unit|chapter|module|week|lesson|step|part)\s*\d+\b/i.test(front)) return true; // syllabus/TOC marker
  if (/\[.*?\]\([^)]*(readme\.md|\.\/\d|to the lesson)/i.test(back)) return true; // navigational link
  return false;
}

export function extractFlashcardList(sectionMd: string): { items: { front: string; back: string }[]; remaining: string } | null {
  const lines = sectionMd.split("\n");
  const termLineRe = /^[-*]\s+\*\*([^*]+)\*\*[.:]?\s*[-–—:]?\s*(.+)$/;
  const listBlocks: { start: number; end: number; items: { front: string; back: string }[] }[] = [];
  let cur: { start: number; end: number; items: { front: string; back: string }[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(termLineRe);
    if (m) {
      if (!cur) cur = { start: i, end: i, items: [] };
      cur.end = i;
      cur.items.push({ front: m[1].trim(), back: m[2].trim() });
    } else if (cur && lines[i].trim() === "") {
      continue;
    } else if (cur) {
      listBlocks.push(cur);
      cur = null;
    }
  }
  if (cur) listBlocks.push(cur);

  // Reject a whole block if most of its items look like nav/TOC entries —
  // this is a structural mismatch (sequence, not vocabulary), not a matter
  // of a few malformed items. Also reject if the "definitions" run long —
  // flip cards read well for a sentence or two, not a paragraph; verbose
  // matches render better as plain flowing text.
  const candidates = listBlocks.filter((b) => {
    if (b.items.length < 4) return false;
    const badCount = b.items.filter((it) => looksLikeNavOrTocItem(it.front, it.back)).length;
    if (badCount / b.items.length >= 0.34) return false;
    const backLens = b.items.map((it) => it.back.length);
    const avgBack = backLens.reduce((a, c) => a + c, 0) / backLens.length;
    const maxBack = Math.max(...backLens);
    return avgBack <= 280 && maxBack <= 450;
  });
  const best = candidates.sort((a, b) => b.items.length - a.items.length)[0];
  if (!best) return null;

  const remaining = lines.filter((_, i) => i < best.start || i > best.end).join("\n");
  return { items: best.items, remaining };
}

// Core markdown -> blocks transform, shared across every course. `lessonPath`
// is used as the base dir for resolving relative image/link URLs.
export function buildLessonBlocksFromReadme(
  readmeMd: string,
  lessonPath: string,
  resolveRelativeUrls: (html: string, baseDir: string) => string,
): Block[] {
  // Video extraction happens per-section (below), not once on the whole
  // document up front — pulling every video out globally would strip
  // them from wherever they actually appear and dump them all together
  // in one place, losing their original heading/paragraph context. A
  // page with a video under each of 3 different headings would render
  // as 3 unrelated videos stacked with no explanation between them.
  // Keeping extraction scoped to each section's own text preserves the
  // source's structure and flow.
  const parts = readmeMd.split(/^##\s+(.+)$/m);
  const introRaw = parts[0] ?? "";
  const sections: { heading: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ heading: parts[i].trim(), body: parts[i + 1] ?? "" });
  }

  const blocks: Block[] = [];

  const { videoIds: introVideoIds, text: introMd } = extractVideosAndStrip(introRaw);
  const introHtml = resolveRelativeUrls(marked.parse(introMd) as string, lessonPath).trim();
  if (introHtml) blocks.push({ type: "text", items: [{ paragraph: introHtml }] });
  for (const id of introVideoIds) blocks.push({ type: "video", url: `https://www.youtube.com/watch?v=${id}` });

  const accordionItems: { title: string; description: string }[] = [];
  for (const section of sections) {
    const heading = stripMarkdownInline(section.heading);
    const isStub = isQuizStubHeading(heading);
    const isSupplementary = !isStub && isSupplementaryHeading(heading);

    // Some sections nest a further level of "### Topic" subsections, each
    // pairing one small heading with its own video(s) (confirmed:
    // data-engineering-zoomcamp's "## Content" section lists 14 "### Topic"
    // subheadings, each followed by a single video link). Render each
    // subsection with its own heading rather than flattening the whole
    // "## Content" section into one undifferentiated stack of videos.
    if (!isStub && !isSupplementary && /^###\s+/m.test(section.body)) {
      const subParts = section.body.split(/^###\s+(.+)$/m);
      const { videoIds: leadVideoIds, text: leadText } = extractVideosAndStrip(subParts[0] ?? "");
      const leadHtml = resolveRelativeUrls(marked.parse(leadText) as string, lessonPath).trim();

      blocks.push({ type: "text", items: [{ heading }] });
      if (leadHtml) blocks.push({ type: "text", items: [{ paragraph: leadHtml }] });
      for (const id of leadVideoIds) blocks.push({ type: "video", url: `https://www.youtube.com/watch?v=${id}` });

      for (let i = 1; i < subParts.length; i += 2) {
        const subHeading = stripMarkdownInline(subParts[i].trim());
        const { videoIds: subVideoIds, text: subText } = extractVideosAndStrip(subParts[i + 1] ?? "");
        const subHtml = resolveRelativeUrls(marked.parse(subText) as string, lessonPath).trim();
        if (!subHtml && !subVideoIds.length) continue;
        blocks.push({ type: "text", items: [{ heading: subHeading }] });
        if (subHtml) blocks.push({ type: "text", items: [{ paragraph: subHtml }] });
        for (const id of subVideoIds) blocks.push({ type: "video", url: `https://www.youtube.com/watch?v=${id}` });
      }
      continue;
    }

    const { videoIds: sectionVideoIds, text: sectionText } = extractVideosAndStrip(section.body);

    const fc = extractFlashcardList(sectionText);
    const bodyMd = fc ? fc.remaining : sectionText;
    const bodyHtml = resolveRelativeUrls(marked.parse(bodyMd) as string, lessonPath).trim();

    if (fc) {
      blocks.push({ type: "text", items: [{ heading }] });
      blocks.push({
        type: "interactive",
        family: "flashcard",
        items: fc.items.map((it) => ({ front: { description: stripMarkdownInline(it.front) }, back: { description: it.back.trim() } })),
      });
      if (bodyHtml) {
        if (isSupplementary) accordionItems.push({ title: `${heading} (continued)`, description: bodyHtml });
        else blocks.push({ type: "text", items: [{ paragraph: bodyHtml }] });
      }
      for (const id of sectionVideoIds) blocks.push({ type: "video", url: `https://www.youtube.com/watch?v=${id}` });
      continue;
    }

    if (!bodyHtml && !sectionVideoIds.length) continue;
    if (isStub) {
      if (bodyHtml) blocks.push({ type: "text", items: [{ paragraph: bodyHtml }] });
    } else if (isSupplementary) {
      if (bodyHtml) accordionItems.push({ title: heading, description: bodyHtml });
    } else {
      blocks.push({ type: "text", items: [{ heading }] });
      if (bodyHtml) blocks.push({ type: "text", items: [{ paragraph: bodyHtml }] });
    }
    for (const id of sectionVideoIds) blocks.push({ type: "video", url: `https://www.youtube.com/watch?v=${id}` });
  }

  if (accordionItems.length) {
    blocks.push({ type: "interactive", family: "interactive", variant: "accordion", items: accordionItems });
  }

  return blocks;
}

// For courses where the real lesson content lives inside notebook markdown
// cells rather than a separate README (confirmed: pytorch-deep-learning,
// tensorflow-deep-learning, introtodeeplearning, Practical_DL,
// Hands-On-AI-for-Beginners — their READMEs are thin pointers or absent,
// while the notebooks themselves interleave narrative markdown with code,
// textbook-style). Extracts just the markdown cells, joins them into one
// virtual document, and reuses buildLessonBlocksFromReadme's heading
// splitting / accordion-restraint / flashcard / video logic on it — the
// same instructional-design rules apply regardless of source shape. Code
// stays out of blocks_json and goes to the separate interactive lab
// (parseNotebookCells on the full notebook), mirroring the existing
// lesson+lab pairing used by the README-based courses.
export function buildLessonBlocksFromNotebook(
  notebookRaw: string,
  lessonPath: string,
  resolveRelativeUrls: (html: string, baseDir: string) => string,
): Block[] {
  let nb: any;
  try { nb = JSON.parse(notebookRaw); } catch { return []; }
  const mdSources = (nb.cells ?? [])
    .filter((c: any) => c.cell_type === "markdown")
    .map((c: any) => (Array.isArray(c.source) ? c.source.join("") : c.source ?? ""))
    // Drop pure Colab/GitHub "badge" cells (an <img>/<a> table with no real
    // prose) and stray "# Copyright Information" boilerplate headings — both
    // confirmed present across these repos' notebooks and neither is real
    // lesson content.
    .map((s: string) => s.replace(/^#\s+Copyright Information\s*$/im, ""))
    .filter((s: string) => s.replace(/<[^>]+>/g, "").replace(/!?\[[^\]]*\]\([^)]+\)/g, "").trim().length > 20);
  const joined = mdSources.join("\n\n");
  return buildLessonBlocksFromReadme(joined, lessonPath, resolveRelativeUrls);
}

export async function renderAndSaveLessonBlocks(prisma: PrismaClient, lessonId: string, blocks: Block[]): Promise<{ html: string; flags: string[] }> {
  const flags: string[] = [];
  const { html } = await renderBlockItems(blocks, new Map(), async () => "", flags);
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { blocks_json: blocks as unknown as Prisma.InputJsonValue, content_body: wrapLessonContent(html) },
  });
  return { html, flags };
}

// Strips the comment portion of each line (naive — doesn't account for a
// literal "#" inside a string, an acceptable tradeoff for a heuristic that
// only decides lab runnability). Confirmed real bug without this: a
// teaching comment like `# name = input(...)` — explaining what the real,
// interactive version would look like — matched the input() pattern below
// even though the code doesn't actually call it, marking a fully runnable
// cell as non-runnable/read-only.
function stripComments(code: string): string {
  return code
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("#");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

export function flagLabCell(code: string): { runnable: boolean; skip_reason?: string } {
  const codeOnly = stripComments(code);
  for (const { pattern, reason } of NON_RUNNABLE_PATTERNS) {
    if (pattern.test(codeOnly)) return { runnable: false, skip_reason: reason };
  }
  return { runnable: true };
}

export function parseNotebookCells(raw: string): LabCell[] {
  let nb: any;
  try { nb = JSON.parse(raw); } catch { return []; }
  const cells: LabCell[] = [];
  for (const cell of nb.cells ?? []) {
    const source = Array.isArray(cell.source) ? cell.source.join("") : (cell.source ?? "");
    if (!source.trim()) continue;
    if (cell.cell_type === "markdown") cells.push({ type: "markdown", content: source });
    else if (cell.cell_type === "code") cells.push({ type: "code", content: source, ...flagLabCell(source) });
  }
  return cells;
}

// Idempotent sibling-lesson creation (assignment pages, etc.) — updates
// content if a lesson with this exact title already exists in the module
// instead of creating a duplicate on re-run.
export async function upsertSiblingLesson(
  prisma: PrismaClient,
  moduleId: string,
  afterLessonId: string,
  title: string,
  contentBody: string,
  durationMinutes = 20,
): Promise<void> {
  const existing = await prisma.lesson.findFirst({ where: { module_id: moduleId, title } });
  if (existing) {
    await prisma.lesson.update({ where: { id: existing.id }, data: { content_body: contentBody } });
    return;
  }
  const parent = await prisma.lesson.findUnique({ where: { id: afterLessonId }, select: { sort_order: true } });
  if (!parent) return;
  await prisma.lesson.updateMany({
    where: { module_id: moduleId, sort_order: { gt: parent.sort_order } },
    data: { sort_order: { increment: 1 } },
  });
  await prisma.lesson.create({
    data: {
      module_id: moduleId,
      title,
      type: "reading",
      sort_order: parent.sort_order + 1,
      duration_minutes: durationMinutes,
      is_published: true,
      content_body: contentBody,
    },
  });
}

// Recursively rewrites <a href="{REPO_PREFIX}..."> links inside any string
// field of a blocks_json structure — used by the cross-reference resolution
// pass. Returns the rewritten value and a count of replacements made.
export function walkReplaceLinks(
  value: any,
  repoPrefix: string,
  resolveTarget: (rawPath: string) => string | null,
): { value: any; count: number } {
  let count = 0;
  const linkRe = new RegExp(`<a\\s+([^>]*?)href="(${repoPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]+)"([^>]*)>`, "g");
  function walk(v: any): any {
    if (typeof v === "string") {
      return v.replace(linkRe, (full, pre, href, post) => {
        const rawPath = href.replace(repoPrefix, "").replace(/^(tree|blob)\/main\//, "").replace(/#.*$/, "").replace(/^\/+|\/+$/g, "");
        const targetId = resolveTarget(rawPath);
        if (!targetId) return full;
        count++;
        return `<a ${pre}href="#lesson:${targetId}" data-internal-lesson="${targetId}"${post}>`;
      });
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, any> = {};
      for (const k of Object.keys(v)) out[k] = walk(v[k]);
      return out;
    }
    return v;
  }
  const result = walk(value);
  return { value: result, count };
}
