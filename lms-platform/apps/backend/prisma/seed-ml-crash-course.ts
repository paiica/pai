/**
 * Seeds "Machine Learning Crash Course" — Google's official ML curriculum
 * at developers.google.com/machine-learning/crash-course, licensed CC BY
 * 4.0 (content) / Apache 2.0 (code) — genuinely the most permissively
 * licensed source found this session (attribution-only, no NonCommercial
 * restriction), so this can be priced normally rather than free-tiered.
 *
 * NOT a git repo — see google-devsite-lib.ts's docblock for the full
 * shape (devsite HTML pages, locale quirk, nav-as-toctree). 4 top-level
 * groups ("ML models", "Data", "Advanced ML models", "Real-world ML") ->
 * 12 units -> 66 content sub-pages, all aggregated one-unit-per-lesson.
 * "Test your knowledge" quizzes and "Interactive/Programming exercises"
 * render via a separate JS widget with no static HTML content — confirmed
 * directly, not fetchable, so this course has no labs/quizzes this round.
 *
 * Run with: npx ts-node prisma/seed-ml-crash-course.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { parseDevsiteNav, fetchNavSourceHtml } from "./google-devsite-lib";

const prisma = new PrismaClient();
const ANCHOR_PAGE = "https://developers.google.com/machine-learning/crash-course/linear-regression";

async function main() {
  console.log("🌱  Seeding Machine Learning Crash Course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "ml-crash-course" },
    update: {},
    create: {
      slug: "ml-crash-course",
      title: "Machine Learning Crash Course",
      subtitle: "Google's official, hands-on introduction to machine learning fundamentals",
      description: "From linear and logistic regression through classification, working with numerical and categorical data, neural networks, embeddings, LLMs, and real-world ML: production systems, AutoML, and fairness.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 15,
      pdu_value: 10,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "Google's official, hands-on introduction to machine learning fundamentals",
        description: "From linear and logistic regression through classification, working with numerical and categorical data, neural networks, embeddings, LLMs, and real-world ML: production systems, AutoML, and fairness.",
        overview_headline: "What You'll Learn",
        overview_body: "Machine Learning Crash Course takes you from linear and logistic regression through classification metrics, working with numerical and categorical data, generalization and overfitting, neural networks, embeddings, an introduction to LLMs, and real-world ML: production systems, AutoML, and fairness.",
        learning_outcomes: [
          "Build and tune linear and logistic regression models",
          "Evaluate classification models with the right metrics",
          "Prepare numerical and categorical data for ML",
          "Understand generalization, overfitting, and regularization",
          "Understand neural networks, embeddings, and LLM fundamentals",
          "Apply real-world ML practices: production systems, AutoML, and fairness",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: ML Models", description: "Linear regression, logistic regression, and classification." },
          { title: "Step 2: Data", description: "Numerical data, categorical data, and generalization/overfitting." },
          { title: "Step 3: Advanced ML Models", description: "Neural networks, embeddings, and an intro to LLMs." },
          { title: "Step 4: Real-World ML", description: "Production ML systems, AutoML, and fairness." },
        ],
        training_exam_prep_headline: "Official Google Curriculum",
        training_exam_prep_body: "Google's own machine learning education curriculum, used to train engineers across the industry.",
        training_exam_prep_items: ["Official Google curriculum", "CC BY 4.0 licensed", "Covers fundamentals through real-world ML practices"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) { console.log(`✓ Modules already exist (skipped)\n✅  Done.\n`); return; }

  const navHtml = await fetchNavSourceHtml(ANCHOR_PAGE);
  const groups = parseDevsiteNav(navHtml);
  console.log(`Parsed ${groups.length} groups, ${groups.reduce((a, g) => a + g.units.length, 0)} units.\n`);

  let moduleSortOrder = 1, totalLessons = 0;
  for (const group of groups) {
    const mod = await prisma.module.create({
      data: { course_id: course.id, title: group.heading, description: "", sort_order: moduleSortOrder++, is_published: true },
    });
    let lessonSortOrder = 1;
    for (const unit of group.units) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title: unit.title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: unit.minutes || 30, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${group.heading} / ${unit.title}  (${unit.pages.length} sub-pages)`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${groups.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
