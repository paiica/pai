/**
 * Enriches the "ML for Beginners" course with real instructional-design
 * content, built as actual blocks_json (flashcards/accordion/video/text) —
 * not a flat HTML dump like enrich-ai-foundations.ts's approach. Each
 * lesson's README.md is parsed into:
 *   - an intro text block (content before the first `##` heading)
 *   - a video block per YouTube thumbnail-link found anywhere in the file
 *   - one flashcards block per section whose content is dominated by a
 *     "**Term**: definition"-style bullet list (a mechanical, principled
 *     rule — not per-lesson guessing)
 *   - everything else collected into one accordion block, one item per
 *     remaining `##` section
 * Then calls the SAME renderBlockItems()/wrapLessonContent() the professor
 * builder's visual block editor uses, so these lessons are fully re-editable
 * afterward — unlike AI Foundations' flat HTML.
 *
 * Also creates a sibling "Assignment" lesson per parent lesson (every lesson
 * folder has an assignment.md) — solution/ notebooks are intentionally never
 * fetched or linked; showing the answer key alongside the exercise isn't
 * good instructional design regardless of source format.
 *
 * Run with: npx ts-node prisma/enrich-ml-for-beginners.ts
 * Safe to re-run for content — overwrites blocks_json/content_body for the
 * same lessons. NOT safe to re-run for assignment-lesson creation (always
 * creates new ones) — guard manually if re-running.
 */

import { config } from "dotenv";
import { resolve as resolvePath, posix as posixPath } from "path";
config({ path: resolvePath(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { marked } from "marked";
import { renderBlockItems, wrapLessonContent } from "../src/modules/content-import/rise-html-blocks";

const prisma = new PrismaClient();

const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/ML-For-Beginners/main";
const REPO_BLOB = "https://github.com/hassanchamas/ML-For-Beginners/blob/main";

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

async function fetchText(path: string): Promise<string | null> {
  const res = await fetch(`${REPO_RAW}/${path}`);
  if (!res.ok) return null;
  return res.text();
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

// Extracts every YouTube video ID referenced anywhere in the markdown
// (thumbnail-links `[![alt](img.youtube.com/vi/ID/0.jpg)](youtu.be/ID)` or
// bare watch links), in first-appearance order, deduped, and returns the
// markdown with those constructs stripped out so they don't also render as
// broken images/links in the section text.
function extractVideosAndStrip(md: string): { videoIds: string[]; text: string } {
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

// A section's bullet list is flashcard-eligible if most items are
// "**Term**: definition"-shaped and there are enough of them to be a real
// glossary rather than a couple of incidentally-bolded list items.
function extractFlashcardList(sectionMd: string): { items: { front: string; back: string }[]; remaining: string } | null {
  const lines = sectionMd.split("\n");
  // Source markdown uses several separator styles after the bold term:
  // "**Term**: def", "**Term** - def", "**Term**. def" — all need the
  // separator itself consumed here, or it leaks into the captured definition
  // (e.g. a bare period-separated item was previously captured as
  // ". Compute power was too limited." instead of "Compute power was too limited.").
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
      continue; // blank line inside a list is fine
    } else if (cur) {
      listBlocks.push(cur);
      cur = null;
    }
  }
  if (cur) listBlocks.push(cur);

  const best = listBlocks.filter((b) => b.items.length >= 4).sort((a, b) => b.items.length - a.items.length)[0];
  if (!best) return null;

  const remaining = lines.filter((_, i) => i < best.start || i > best.end).join("\n");
  return { items: best.items, remaining };
}

// Section headings occasionally contain markdown link/emphasis syntax
// (e.g. "[Pre-lecture quiz](https://...)") that needs to render as plain
// text in an accordion title, not leak raw markdown.
function stripMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

// Accordion is for genuinely optional/supplementary material a student can
// skip — not the lesson's core sequential content. An earlier version of
// this script put EVERY section behind an accordion toggle, which hid the
// actual teaching material (Introduction, concept explanations, exercises)
// behind clicks instead of just... being the lesson. Only "Challenge" and
// "Review & Self Study" sections are genuinely optional add-ons; everything
// else renders as normal flowing content with a heading, like a real lesson
// page (and gives the table-of-contents something to anchor to).
function isSupplementaryHeading(heading: string): boolean {
  const h = heading.toLowerCase();
  return /challenge/.test(h) || /review\s*&?\s*self.?study/.test(h) || h.trim() === "review";
}

// "Pre-lecture quiz" / "Post-lecture quiz" sections are leftover video-intro
// framing text ("🎥 Click the image above...") — meaningful before the video
// was pulled out into its own block by extractVideosAndStrip, dead weight as
// a standalone labeled section afterward. Folded into plain flow, unlabeled.
function isQuizStubHeading(heading: string): boolean {
  return /pre-lecture quiz|post-lecture quiz/i.test(heading);
}

type Block = Record<string, any>;

async function buildLessonBlocks(lessonPath: string, readmeMd: string): Promise<Block[]> {
  // Video extraction happens per-section (and per-###-subsection) below,
  // not once on the whole document up front — pulling every video out
  // globally strips them from wherever they actually appear and dumps
  // them all together in one place, losing their original heading
  // context (confirmed real bug: "History of machine learning" has 4
  // videos under 4 different ## headings scattered through the doc, but
  // all 4 rendered stacked at the very top with none of their
  // surrounding explanation).
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
    // pairing one small heading with its own video(s) — render each
    // subsection with its own heading rather than flattening the whole
    // section into one undifferentiated stack of videos.
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
      // The flashcard set itself always gets its own heading + interactive
      // block, regardless of what the surrounding section is — a glossary
      // list is worth calling out either way.
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

async function createAssignmentLesson(parentLessonId: string, moduleId: string, lessonPath: string, parentTitle: string) {
  const md = await fetchText(`${lessonPath}/assignment.md`);
  if (!md) return;

  const html = resolveRelativeUrls(marked.parse(md) as string, lessonPath);
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? stripMarkdownInline(titleMatch[1]) : `${parentTitle} — Assignment`;
  const sourceLink = `${REPO_BLOB}/${lessonPath}/assignment.md`;
  const contentBody = [
    `<blockquote><em>Adapted from the open-source "ML For Beginners" curriculum (Microsoft, MIT License). View the <a href="${sourceLink}" target="_blank" rel="noopener noreferrer">original file</a>.</em></blockquote>`,
    html,
  ].join("\n");

  // Idempotent — a sibling with this exact title in this module already
  // existing means a prior run already created it; just refresh its content
  // instead of creating a duplicate on re-run.
  const existing = await prisma.lesson.findFirst({ where: { module_id: moduleId, title } });
  if (existing) {
    await prisma.lesson.update({ where: { id: existing.id }, data: { content_body: contentBody } });
    console.log(`    ✓ Assignment sibling (updated): "${title}"`);
    return;
  }

  const parent = await prisma.lesson.findUnique({ where: { id: parentLessonId }, select: { sort_order: true } });
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
      duration_minutes: 20,
      is_published: true,
      content_body: contentBody,
    },
  });
  console.log(`    ✓ Assignment sibling (created): "${title}"`);
}

async function main() {
  console.log("🌱  Enriching ML for Beginners with blocks-based content…\n");
  const course = await prisma.course.findUnique({ where: { slug: "ml-for-beginners" } });
  if (!course) throw new Error("Run seed-ml-for-beginners.ts first");

  let updated = 0, assignmentsCreated = 0;
  const noopUpload = async () => "";

  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) { console.warn(`⚠ Module not found: ${modDef.title}`); continue; }

    for (const folder of modDef.folders) {
      const lessonPath = `${modDef.sectionPath}/${folder}`;
      const readme = await fetchText(`${lessonPath}/README.md`);
      if (!readme) { console.warn(`⚠ No README for ${lessonPath}`); continue; }

      const titleMatch = readme.match(/^#\s+(.+)$/m);
      const lessonTitle = titleMatch ? titleMatch[1].replace(/[`*_]/g, "").trim() : folder;
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${modDef.title} / ${lessonTitle}`); continue; }

      const blocks = await buildLessonBlocks(lessonPath, readme);
      const flags: string[] = [];
      const { html } = await renderBlockItems(blocks, new Map(), noopUpload, flags);
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { blocks_json: blocks as unknown as Prisma.InputJsonValue, content_body: wrapLessonContent(html) },
      });
      console.log(`✓ ${lessonTitle}  (${blocks.length} blocks${flags.length ? `, flags: ${flags.join("; ")}` : ""})`);
      updated++;

      await createAssignmentLesson(lesson.id, mod.id, lessonPath, lessonTitle);
      assignmentsCreated++;
    }
  }

  console.log(`\n✅  Enriched ${updated} lessons, created ${assignmentsCreated} assignment sibling(s).\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
