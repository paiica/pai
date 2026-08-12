/**
 * Resolves GitHub links embedded in AI Foundations lesson content so students
 * never have to leave the platform to read required material:
 *
 * - Links to a genuine instruction file (assignment.md, or a lab/*.md file)
 *   get a new sibling "Reading" lesson created right after the parent lesson
 *   in the same module, containing that file's rendered content (fetched +
 *   converted the same way enrich-ai-foundations.ts already does per-file).
 *   The original link is rewritten to navigate to that lesson in-app.
 * - Links that just cross-reference another AI Foundations lesson's own
 *   source folder are rewritten to an internal link to that lesson directly
 *   — no new content, the platform already has it.
 * - Everything else (attribution links, own-lesson notebook links, binary
 *   files, week-level overview READMEs) is left untouched; it already opens
 *   in a new tab via addTargetBlankToLinks on the frontend.
 *
 * Internal links use the `#lesson:{id}` + `data-internal-lesson="{id}"`
 * scheme the lesson player's click handler resolves client-side against the
 * viewer's own enrollment (see handleInternalLessonClick in lib/utils.ts) —
 * a static href can't hardcode the enrollment-scoped lesson player URL.
 *
 * Run with: npx ts-node prisma/resolve-github-links-ai-foundations.ts
 * Safe to re-run for the cross-reference rewrites (idempotent string
 * replace). NOT safe to re-run for the instruction-lesson creation step —
 * it always creates new lessons, so guard re-runs manually if ever needed.
 */

import { config } from "dotenv";
import { resolve as resolvePath, posix as posixPath } from "path";
config({ path: resolvePath(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { marked } from "marked";

const prisma = new PrismaClient();

const REPO_PREFIX = "https://github.com/hassanchamas/AI-For-Beginners/";
const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/AI-For-Beginners/main";
const REPO_BLOB = "https://github.com/hassanchamas/AI-For-Beginners/blob/main";

const normalize = (p: string) => p.replace(/^\/+|\/+$/g, "");
const toDir = (p: string) => (/\.[a-zA-Z0-9]+$/.test(p) ? p.replace(/\/[^/]+$/, "") : p);

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

async function fetchText(path: string): Promise<string | null> {
  const res = await fetch(`${REPO_RAW}/${path}`);
  if (!res.ok) {
    console.warn(`    ⚠ fetch failed (${res.status}): ${path}`);
    return null;
  }
  return res.text();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const linkRe = /<a\s+[^>]*href="(https:\/\/github\.com\/hassanchamas\/AI-For-Beginners\/[^"]+)"[^>]*>(.*?)<\/a>/gs;

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: "ai-foundations" } });
  if (!course) throw new Error("ai-foundations course not found");

  const lessons = await prisma.lesson.findMany({
    where: { module: { course_id: course.id } },
    select: { id: true, title: true, content_body: true, sort_order: true, module_id: true,
      module: { select: { sort_order: true } } },
    orderBy: [{ module: { sort_order: "asc" } }, { sort_order: "asc" }],
  });

  // Derive each lesson's own source folder from its "original source folder" attribution link.
  const ownDir = new Map<string, string>();
  for (const l of lessons) {
    if (!l.content_body) continue;
    for (const m of l.content_body.matchAll(linkRe)) {
      const text = m[2].replace(/<[^>]+>/g, "").trim();
      if (/original source folder/i.test(text)) {
        const raw = normalize(m[1].replace(REPO_PREFIX, "").replace(/^(tree|blob)\/main\//, ""));
        ownDir.set(l.id, toDir(raw));
        break;
      }
    }
  }
  const dirToLesson = new Map<string, (typeof lessons)[number]>();
  for (const l of lessons) {
    const d = ownDir.get(l.id);
    if (d) dirToLesson.set(d, l);
  }

  // href -> replacement target lesson id, scoped per source lesson (a given
  // href always resolves the same way everywhere it's found, but we still
  // key per-lesson since replacement happens lesson-by-lesson).
  type Rewrite = { href: string; targetLessonId: string };
  const rewritesByLesson = new Map<string, Rewrite[]>();
  function addRewrite(lessonId: string, href: string, targetLessonId: string) {
    if (!rewritesByLesson.has(lessonId)) rewritesByLesson.set(lessonId, []);
    rewritesByLesson.get(lessonId)!.push({ href, targetLessonId });
  }

  // ─── Pass 1: classify + create sibling instruction lessons ─────────────
  let created = 0;
  for (const l of lessons) {
    if (!l.content_body) continue;
    const own = ownDir.get(l.id) ?? null;
    const seenHref = new Set<string>();

    for (const m of l.content_body.matchAll(linkRe)) {
      const href = m[1];
      if (seenHref.has(href)) continue;
      seenHref.add(href);

      const rawPath = normalize(href.replace(REPO_PREFIX, "").replace(/^(tree|blob)\/main\//, "").replace(/#.*$/, ""));
      if (own && rawPath === own) continue; // self attribution, leave as-is
      const isNotebook = /\.ipynb$/i.test(rawPath);
      const isMd = /\.md$/i.test(rawPath);
      const rawDir = toDir(rawPath);

      const targetLesson = dirToLesson.get(rawDir) && dirToLesson.get(rawDir)!.id !== l.id ? dirToLesson.get(rawDir)! : null;
      if (targetLesson) {
        addRewrite(l.id, href, targetLesson.id);
        continue;
      }

      const isOwn = !!own && (rawPath === own || rawDir === own || rawDir.startsWith(own + "/"));
      if (isOwn && isNotebook) continue; // own notebook — left as external reference

      const isAssignmentLike = isOwn && isMd && (/\/assignment\.md$/i.test(rawPath) || /\/lab\/[^/]+\.md$/i.test(rawPath));
      if (!isAssignmentLike) continue; // everything else stays external (setup docs, topic articles, binaries, week overviews)

      const md = await fetchText(rawPath);
      if (!md) continue;

      const baseDir = posixPath.dirname(rawPath);
      const bodyHtml = resolveRelativeUrls(marked.parse(md) as string, baseDir);
      const titleMatch = md.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `${l.title} — Assignment`;
      const sourceLink = `${REPO_BLOB}/${rawPath}`;
      const html = [
        `<blockquote><em>Adapted from the open-source "AI For Beginners" curriculum by Dmitry Soshnikov and contributors (Microsoft, MIT License). View the <a href="${sourceLink}" target="_blank" rel="noopener noreferrer">original file</a>.</em></blockquote>`,
        bodyHtml,
      ].join("\n");

      // Shift sort_order of later lessons in this module, then insert right after the parent.
      const parent = await prisma.lesson.findUnique({ where: { id: l.id }, select: { sort_order: true, module_id: true } });
      await prisma.lesson.updateMany({
        where: { module_id: parent!.module_id, sort_order: { gt: parent!.sort_order } },
        data: { sort_order: { increment: 1 } },
      });
      const newLesson = await prisma.lesson.create({
        data: {
          module_id: parent!.module_id,
          title,
          type: "reading",
          sort_order: parent!.sort_order + 1,
          duration_minutes: 15,
          is_published: true,
          is_free_preview: false,
          content_body: html,
        },
      });
      console.log(`✓ Created sibling lesson "${title}" after "${l.title}" (${(html.length / 1024).toFixed(1)} KB)`);
      created++;

      addRewrite(l.id, href, newLesson.id);
    }
  }

  // ─── Pass 2: rewrite anchors in-place (instructions + cross-refs together) ─
  let rewrittenLessons = 0;
  for (const [lessonId, rewrites] of rewritesByLesson) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { content_body: true } });
    if (!lesson?.content_body) continue;
    let body = lesson.content_body;
    for (const { href, targetLessonId } of rewrites) {
      const re = new RegExp(`<a\\s+[^>]*href="${escapeRegExp(href)}"[^>]*>(.*?)</a>`, "gs");
      body = body.replace(re, `<a href="#lesson:${targetLessonId}" data-internal-lesson="${targetLessonId}">$1</a>`);
    }
    await prisma.lesson.update({ where: { id: lessonId }, data: { content_body: body } });
    rewrittenLessons++;
  }

  console.log(`\n✅ Created ${created} sibling instruction lesson(s); rewrote links in ${rewrittenLessons} lesson(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
