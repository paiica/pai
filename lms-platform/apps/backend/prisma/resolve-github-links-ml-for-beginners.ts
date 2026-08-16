/**
 * Resolves GitHub cross-reference links in ML for Beginners lesson content
 * to internal in-app navigation — same classification logic as
 * resolve-github-links-ai-foundations.ts, but this course's content lives in
 * blocks_json (not flat HTML), so the rewrite walks the blocks structure
 * recursively (any string field, since href-bearing HTML can appear in a
 * text block's paragraph, an accordion item's description, a flashcard's
 * front/back, etc.) and then re-renders content_body from the updated
 * blocks — keeping both in sync, so the lesson stays correctly editable in
 * the visual block editor afterward.
 *
 * Only cross-references to another already-seeded lesson's own folder are
 * rewritten (own-notebook links are superseded by labs already; genuine
 * instruction files were already split into sibling lessons by
 * enrich-ml-for-beginners.ts; everything else stays external and already
 * gets target="_blank" platform-wide).
 *
 * Run with: npx ts-node prisma/resolve-github-links-ml-for-beginners.ts
 * Safe to re-run — idempotent string replacement.
 */

import { config } from "dotenv";
import { resolve as resolvePath } from "path";
config({ path: resolvePath(__dirname, "../.env") });

import { PrismaClient, Prisma } from "@prisma/client";
import { renderBlockItems, wrapLessonContent } from "../src/modules/content-import/rise-html-blocks";

const prisma = new PrismaClient();
const REPO_PREFIX = "https://github.com/hassanchamas/ML-For-Beginners/";

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

const normalize = (p: string) => p.replace(/^\/+|\/+$/g, "");
const toDir = (p: string) => (/\.[a-zA-Z0-9]+$/.test(p) ? p.replace(/\/[^/]+$/, "") : p);

function walkReplace(value: any, replacer: (s: string) => string): any {
  if (typeof value === "string") return replacer(value);
  if (Array.isArray(value)) return value.map((v) => walkReplace(v, replacer));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) out[k] = walkReplace(value[k], replacer);
    return out;
  }
  return value;
}

async function main() {
  console.log("🌱  Resolving GitHub cross-reference links for ML for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "ml-for-beginners" } });
  if (!course) throw new Error("Run seed-ml-for-beginners.ts first");

  // lessonPath (folder) -> { lessonId, title } for every original (non-
  // assignment, non-quiz) lesson, to resolve cross-reference targets.
  // Cross-references only ever point at an *original* lesson's own folder
  // (never at a generated assignment/quiz sibling), so re-fetching each
  // README's H1 here (small, cheap files) and matching by title — the same
  // resolution seed/enrich already do — is the simplest reliable way to
  // build this map without depending on lesson ordering/position.
  const dirToLesson = new Map<string, { id: string; title: string }>();
  const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/ML-For-Beginners/main";
  async function fetchText(path: string): Promise<string | null> {
    const res = await fetch(`${REPO_RAW}/${path}`);
    if (!res.ok) return null;
    return res.text();
  }

  const lessonPathList: { modDef: (typeof MODULES)[number]; folder: string; lessonPath: string }[] = [];
  for (const modDef of MODULES) {
    for (const folder of modDef.folders) lessonPathList.push({ modDef, folder, lessonPath: `${modDef.sectionPath}/${folder}` });
  }

  for (const { modDef, lessonPath } of lessonPathList) {
    const readme = await fetchText(`${lessonPath}/README.md`);
    const titleMatch = readme?.match(/^#\s+(.+)$/m);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/[`*_]/g, "").trim();
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title } });
    if (lesson) dirToLesson.set(normalize(lessonPath), { id: lesson.id, title });
  }
  console.log(`Resolved ${dirToLesson.size} lesson folder → lesson mappings.\n`);

  let rewrittenLessons = 0, rewrittenLinks = 0;
  const allLessons = await prisma.lesson.findMany({
    where: { module: { course_id: course.id }, blocks_json: { not: Prisma.JsonNull } },
    select: { id: true, title: true, blocks_json: true },
  });

  for (const lesson of allLessons) {
    const blocksStr = JSON.stringify(lesson.blocks_json);
    if (!blocksStr.includes(REPO_PREFIX)) continue;

    let localRewrites = 0;
    const linkRe = /<a\s+([^>]*?)href="(https:\/\/github\.com\/hassanchamas\/ML-For-Beginners\/[^"]+)"([^>]*)>/g;
    const newBlocks = walkReplace(lesson.blocks_json, (s) =>
      s.replace(linkRe, (full, pre, href, post) => {
        const rawPath = normalize(href.replace(REPO_PREFIX, "").replace(/^(tree|blob)\/main\//, "").replace(/#.*$/, ""));
        const dir = toDir(rawPath);
        const target = dirToLesson.get(dir);
        if (!target || target.id === lesson.id) return full;
        localRewrites++;
        return `<a ${pre}href="#lesson:${target.id}" data-internal-lesson="${target.id}"${post}>`;
      })
    );

    if (!localRewrites) continue;
    const flags: string[] = [];
    const { html } = await renderBlockItems(newBlocks, new Map(), async () => "", flags);
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { blocks_json: newBlocks as unknown as Prisma.InputJsonValue, content_body: wrapLessonContent(html) },
    });
    console.log(`✓ ${lesson.title}: rewrote ${localRewrites} internal link(s)`);
    rewrittenLessons++;
    rewrittenLinks += localRewrites;
  }

  console.log(`\n✅  Rewrote ${rewrittenLinks} link(s) across ${rewrittenLessons} lesson(s).\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
