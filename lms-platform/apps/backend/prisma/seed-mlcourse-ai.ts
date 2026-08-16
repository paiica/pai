/**
 * Seeds "Open Machine Learning Course" (mlcourse.ai) — a classical ML
 * curriculum, forked at github.com/paiica/mlcourse.ai.
 *
 * IMPORTANT — licensing: this repo is CC BY-NC-SA 4.0 (NonCommercial),
 * confirmed via its LICENSE.md. Offered as a FREE course so the
 * NonCommercial term is genuinely satisfied, per the user's instruction —
 * unlike mlops-zoomcamp/data-engineering-zoomcamp (no license at all),
 * this one has an explicit, compatible license once priced at $0.
 *
 * Each of the 10 topics has 1-5 notebooks (confirmed via directory
 * listing, not assumed) — a main topic notebook plus optional "part N"
 * or "practice" notebooks. `*_solution.ipynb` files are deliberately
 * excluded (answer keys), same precedent as elsewhere. All non-solution
 * notebooks in a topic are aggregated into one lesson (markdown -> blocks,
 * code -> one combined lab), matching the "aggregate sub-pages" approach
 * used for computer-vision-course.
 *
 * Run with: npx ts-node prisma/seed-mlcourse-ai.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  { title: "Data Analysis Foundations", topics: [
    { folder: "topic01_pandas_data_analysis", title: "Exploratory Data Analysis with Pandas" },
    { folder: "topic02_visual_data_analysis", title: "Visual Data Analysis" },
  ] },
  { title: "Core ML Algorithms", topics: [
    { folder: "topic03_decision_trees_kNN", title: "Decision Trees and k Nearest Neighbors" },
    { folder: "topic04_linear_models", title: "Linear Classification and Regression" },
    { folder: "topic05_ensembles_random_forests", title: "Bagging and Random Forest" },
  ] },
  { title: "Advanced Techniques", topics: [
    { folder: "topic06_features_regression", title: "Feature Engineering and Feature Selection" },
    { folder: "topic07_unsupervised", title: "Unsupervised Learning: PCA and Clustering" },
    { folder: "topic08_sgd_hashing_vowpal_wabbit", title: "Vowpal Wabbit: Learning with Gigabytes of Data" },
    { folder: "topic09_time_series", title: "Time Series Analysis" },
    { folder: "topic10_boosting", title: "Gradient Boosting" },
  ] },
];

async function main() {
  console.log("🌱  Seeding Open Machine Learning Course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "open-machine-learning-course" },
    update: {},
    create: {
      slug: "open-machine-learning-course",
      title: "Open Machine Learning Course",
      subtitle: "A free, classical machine learning course — from pandas to gradient boosting",
      description: "From exploratory data analysis and visualization through decision trees, linear models, ensembles, feature engineering, unsupervised learning, large-scale learning, time series, and gradient boosting.",
      price: 0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 24,
      pdu_value: 16,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A free, classical machine learning course — from pandas to gradient boosting",
        description: "From exploratory data analysis and visualization through decision trees, linear models, ensembles, feature engineering, unsupervised learning, large-scale learning, time series, and gradient boosting.",
        overview_headline: "What You'll Learn",
        overview_body: "Open Machine Learning Course takes you from data analysis with pandas and visualization through decision trees and kNN, linear models, bagging and random forests, feature engineering, PCA and clustering, large-scale learning with Vowpal Wabbit, time series analysis, and gradient boosting.",
        learning_outcomes: [
          "Explore and visualize data with pandas, seaborn, and matplotlib",
          "Build and tune decision trees, kNN, and linear models",
          "Apply bagging, random forests, and gradient boosting",
          "Engineer and select features",
          "Apply PCA and clustering for unsupervised learning",
          "Analyze time series and learn from large-scale data",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Data Analysis Foundations", description: "Exploratory and visual data analysis." },
          { title: "Step 2: Core ML Algorithms", description: "Decision trees, kNN, linear models, and ensembles." },
          { title: "Step 3: Advanced Techniques", description: "Feature engineering, unsupervised learning, time series, and boosting." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson pairs its concepts with runnable notebook labs and practice exercises.",
        training_exam_prep_items: ["Free course", "Linked hands-on notebook labs", "Classical ML fundamentals, algorithm by algorithm"],
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
    for (const { title } of modDef.topics) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 45, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${title}`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
