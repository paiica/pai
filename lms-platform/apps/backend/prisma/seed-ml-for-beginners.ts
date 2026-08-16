/**
 * Seeds the "ML for Beginners" standalone course — Microsoft's classic ML
 * curriculum ("12 weeks, 26 lessons, 52 quizzes"; the source repo actually
 * has 27 numbered lesson folders — verified directly via the GitHub API,
 * not the repo's own tagline), adapted by PAII, forked at
 * github.com/hassanchamas/ML-For-Beginners.
 *
 * Two-phase pipeline (matches seed-ai-foundations.ts's convention):
 *   1. seed-ml-for-beginners.ts (this file) — course + module/lesson shells,
 *      with real titles fetched from each lesson's own README.md.
 *   2. enrich-ml-for-beginners.ts — blocks-based content (accordion/
 *      flashcards/video), assignment sibling lessons.
 *   3. build-lab-cells-ml-for-beginners.ts — runnable labs from notebooks.
 *   4. import-quizzes-ml-for-beginners.ts — quiz lessons.
 *   5. resolve-github-links-ml-for-beginners.ts — internal cross-links.
 *
 * Created as status: draft / is_listed: false — review in the admin course
 * builder and publish manually when ready.
 *
 * Run with: npx ts-node prisma/seed-ml-for-beginners.ts
 * Safe to re-run — upserts the course by slug; skips module/lesson creation
 * if they already exist for this course.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/ML-For-Beginners/main";

type LessonDef = { title: string; path: string; folderName: string };
type ModuleDef = { title: string; description: string; sectionPath: string; lessons: LessonDef[] };

// Verified directly via `gh api repos/hassanchamas/ML-For-Beginners/contents/{section}`
// — not the repo's own "26 lessons" tagline, which undercounts by one.
const MODULES: { title: string; description: string; sectionPath: string; folders: string[] }[] = [
  { title: "Week 1: Introduction to Machine Learning", description: "What ML is, its history, fairness, and the core techniques.", sectionPath: "1-Introduction", folders: ["1-intro-to-ML", "2-history-of-ML", "3-fairness", "4-techniques-of-ML"] },
  { title: "Week 2: Regression", description: "Build your first ML models with regression techniques.", sectionPath: "2-Regression", folders: ["1-Tools", "2-Data", "3-Linear", "4-Logistic"] },
  { title: "Week 3: Build a Web App", description: "Use a trained model in a web application.", sectionPath: "3-Web-App", folders: ["1-Web-App"] },
  { title: "Week 4: Classification", description: "Classification techniques applied to a real-world cuisine dataset.", sectionPath: "4-Classification", folders: ["1-Introduction", "2-Classifiers-1", "3-Classifiers-2", "4-Applied"] },
  { title: "Week 5: Clustering", description: "Unsupervised learning techniques for clustering data.", sectionPath: "5-Clustering", folders: ["1-Visualize", "2-K-Means"] },
  { title: "Week 6: Natural Language Processing", description: "NLP basics through building a simple chatbot.", sectionPath: "6-NLP", folders: ["1-Introduction-to-NLP", "2-Tasks", "3-Translation-Sentiment", "4-Hotel-Reviews-1", "5-Hotel-Reviews-2"] },
  { title: "Week 7: Time Series Forecasting", description: "Forecasting techniques for time series data.", sectionPath: "7-TimeSeries", folders: ["1-Introduction", "2-ARIMA", "3-SVR"] },
  { title: "Week 8: Reinforcement Learning", description: "Reinforcement learning fundamentals with Q-Learning and Gym.", sectionPath: "8-Reinforcement", folders: ["1-QLearning", "2-Gym"] },
  { title: "Week 9: Real-World ML", description: "Applying and debugging ML models in the real world.", sectionPath: "9-Real-World", folders: ["1-Applications", "2-Debugging-ML-Models"] },
];

async function fetchText(path: string): Promise<string | null> {
  const res = await fetch(`${REPO_RAW}/${path}`);
  if (!res.ok) return null;
  return res.text();
}

// Falls back to a title-cased version of the folder name if the README has
// no H1 — every sampled lesson had one, this is just a safety net.
function titleCaseFolderName(folder: string): string {
  return folder.replace(/^\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function resolveTitle(lessonPath: string, folder: string): Promise<string> {
  const md = await fetchText(`${lessonPath}/README.md`);
  const h1 = md?.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return h1 ? h1.replace(/[`*_]/g, "") : titleCaseFolderName(folder);
}

async function main() {
  console.log("🌱  Seeding ML for Beginners course…\n");

  const course = await prisma.course.upsert({
    where: { slug: "ml-for-beginners" },
    update: {},
    create: {
      slug: "ml-for-beginners",
      title: "ML for Beginners",
      subtitle: "A 9-week, hands-on introduction to classic machine learning",
      description: "Regression, classification, clustering, NLP, time series, and reinforcement learning — a practical foundation in classic ML, built on real-world datasets.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 45,
      pdu_value: 30,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A 9-week, hands-on introduction to classic machine learning",
        description: "Regression, classification, clustering, NLP, time series, and reinforcement learning — a practical foundation in classic ML, built on real-world datasets.",
        overview_headline: "What You'll Learn",
        overview_body: "ML for Beginners takes you from the history and fairness questions behind machine learning through the core classic-ML techniques: regression, classification, clustering, NLP, time series forecasting, and reinforcement learning — each paired with a hands-on lab against a real dataset.",
        learning_outcomes: [
          "Explain what machine learning is and how it differs from classical programming",
          "Build and evaluate regression and classification models",
          "Apply clustering techniques to explore unlabeled data",
          "Apply core NLP techniques, including translation and sentiment analysis",
          "Forecast time series data with ARIMA and SVR",
          "Apply reinforcement learning to a simple game environment",
          "Recognize fairness and bias considerations in ML systems",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Introduction & Regression", description: "Start with what ML is, its history and fairness questions, then build your first regression models." },
          { title: "Step 2: Classification & Clustering", description: "Classify real-world data and explore it with unsupervised clustering." },
          { title: "Step 3: NLP & Time Series", description: "Apply core NLP techniques and forecast time series data." },
          { title: "Step 4: Reinforcement Learning & Real-World ML", description: "Close with reinforcement learning and the realities of debugging ML models in production." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson with a notebook links to a runnable lab so you practice each concept in code, not just theory.",
        training_exam_prep_items: ["Module knowledge-check quizzes", "Linked hands-on notebook labs", "scikit-learn, pandas, and numpy examples", "Real datasets, not toy demos"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug}) — status: ${course.status}, listed: ${course.is_listed}`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) {
    console.log(`✓ Modules already exist for this course (skipped) — ${existingModules} found`);
    console.log("\n✅  Done.\n");
    return;
  }

  let moduleSortOrder = 1;
  let totalLessons = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.create({
      data: {
        course_id: course.id,
        title: modDef.title,
        description: modDef.description,
        sort_order: moduleSortOrder++,
        is_published: true,
      },
    });

    let lessonSortOrder = 1;
    for (const folder of modDef.folders) {
      const lessonPath = `${modDef.sectionPath}/${folder}`;
      const title = await resolveTitle(lessonPath, folder);
      await prisma.lesson.create({
        data: {
          module_id: mod.id,
          title,
          type: "reading",
          sort_order: lessonSortOrder++,
          duration_minutes: 30,
          is_published: true,
          is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${title}  (${lessonPath})`);
    }
  }

  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
