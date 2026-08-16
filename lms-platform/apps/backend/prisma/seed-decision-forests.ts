/**
 * Seeds "Decision Forests" — Google's official course at
 * developers.google.com/machine-learning/decision-forests, CC BY 4.0 /
 * Apache 2.0 licensed. Unlike ml-crash-course/recommendation-systems,
 * this course's 8 topic groups have NO enclosing devsite-nav-heading —
 * they're top-level devsite-nav-expandable items (see
 * parseDevsiteExpandableUnits in google-devsite-lib.ts). Each of the 8
 * groups becomes one lesson (its sub-pages joined), grouped into 3
 * modules matching the course's own conceptual arc.
 *
 * Run with: npx ts-node prisma/seed-decision-forests.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

const MODULES = [
  { title: "Decision Trees", units: ["What's in this course?", "What are Decision Trees?", "How do You Train Decision Trees?", "A Decision Tree Example"] },
  { title: "Decision Forests", units: ["What are Decision Forests?", "What are Random Forests?"] },
  { title: "Gradient Boosted Decision Trees", units: ["What are Gradient Boosted Decision Trees?", "What did you learn?"] },
];

async function main() {
  console.log("🌱  Seeding Decision Forests…\n");
  const course = await prisma.course.upsert({
    where: { slug: "decision-forests" },
    update: {},
    create: {
      slug: "decision-forests",
      title: "Decision Forests",
      subtitle: "Google's official course on decision trees, random forests, and gradient boosting",
      description: "Learn how decision trees are grown and trained, how random forests and gradient boosted decision trees improve on them, and how to apply these models in practice.",
      price: 199.0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 5,
      pdu_value: 4,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "Google's official course on decision trees, random forests, and gradient boosting",
        description: "Learn how decision trees are grown and trained, how random forests and gradient boosted decision trees improve on them, and how to apply these models in practice.",
        overview_headline: "What You'll Learn",
        overview_body: "Decision Forests covers how decision trees are grown and trained, binary classification, overfitting and pruning, variable importance, random forests, out-of-bag evaluation, and gradient boosted decision trees.",
        learning_outcomes: [
          "Understand how decision trees are grown and trained",
          "Recognize and address overfitting and pruning",
          "Evaluate variable importance in tree-based models",
          "Build random forests and understand out-of-bag evaluation",
          "Understand gradient boosted decision trees and regularization",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Decision Trees", description: "Overview, conditions, and how trees are grown and trained." },
          { title: "Step 2: Decision Forests", description: "Random forests and out-of-bag evaluation." },
          { title: "Step 3: Gradient Boosted Decision Trees", description: "The gradient boosting algorithm, overfitting, and regularization." },
        ],
        training_exam_prep_headline: "Official Google Curriculum",
        training_exam_prep_body: "Google's own machine learning education curriculum, used to train engineers across the industry.",
        training_exam_prep_items: ["Official Google curriculum", "CC BY 4.0 licensed", "Covers decision trees through gradient boosting"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) { console.log(`✓ Modules already exist (skipped)\n✅  Done.\n`); return; }

  let moduleSortOrder = 1, totalLessons = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.create({
      data: { course_id: course.id, title: modDef.title, description: "", sort_order: moduleSortOrder++, is_published: true },
    });
    let lessonSortOrder = 1;
    for (const unitTitle of modDef.units) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title: unitTitle, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 30, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${unitTitle}`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
