/**
 * Replaces plain-text YouTube links inside AI Foundations lesson content
 * with an embedded, playable video — the same "rewrite in place" approach
 * enrich-ai-foundations.ts already uses for images (absolute URLs swapped
 * directly into the HTML at the point they appear).
 *
 * Reuses the exact `aspect-video rounded-xl overflow-hidden bg-black
 * shadow-lg` class string the VideoLesson component already renders
 * elsewhere in the frontend, so Tailwind's build-time class scan (which
 * can't see classes injected only through dangerouslySetInnerHTML content)
 * still generates the CSS for them.
 *
 * Run with: npx ts-node prisma/embed-youtube-ai-foundations.ts
 * Safe to re-run — skips links already rewritten to an iframe.
 */

import { config } from "dotenv";
import { resolve as resolvePath } from "path";
config({ path: resolvePath(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const YT_LINK_RE = /<a\s+[^>]*href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^"]+)"[^>]*>(.*?)<\/a>/gs;

function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

function embedHtml(videoId: string, title: string): string {
  return `<div class="aspect-video rounded-xl overflow-hidden bg-black shadow-lg" style="max-width:640px;margin:1rem 0;"><iframe src="https://www.youtube.com/embed/${videoId}" title="${title.replace(/"/g, "&quot;")}" allowfullscreen style="width:100%;height:100%;border:0;"></iframe></div>`;
}

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: "ai-foundations" } });
  if (!course) throw new Error("ai-foundations course not found");

  const lessons = await prisma.lesson.findMany({
    where: { module: { course_id: course.id }, content_body: { not: null } },
    select: { id: true, title: true, content_body: true },
  });

  let updatedLessons = 0, embeddedCount = 0;
  for (const l of lessons) {
    const body = l.content_body!;
    if (!YT_LINK_RE.test(body)) continue;
    YT_LINK_RE.lastIndex = 0;

    let changed = false;
    const next = body.replace(YT_LINK_RE, (full, href, linkText) => {
      const videoId = extractVideoId(href);
      if (!videoId) return full;
      changed = true;
      embeddedCount++;
      const cleanText = linkText.replace(/<[^>]+>/g, "").trim() || l.title;
      return embedHtml(videoId, cleanText);
    });

    if (changed) {
      await prisma.lesson.update({ where: { id: l.id }, data: { content_body: next } });
      console.log(`✓ Embedded video(s) in "${l.title}"`);
      updatedLessons++;
    }
  }

  console.log(`\n✅ Embedded ${embeddedCount} video link(s) across ${updatedLessons} lesson(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
