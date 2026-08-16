/**
 * Seeds "TensorFlow for Deep Learning" — the Zero to Mastery TensorFlow
 * course, forked at github.com/hassanchamas/tensorflow-deep-learning.
 * Same notebook-as-lesson shape as pytorch-deep-learning (see that seed
 * script's docblock). Lesson 11 (TensorFlow Developer Certification exam
 * prep) is deliberately excluded — the source repo itself flags it
 * "(archive)": the certification program was discontinued 2024-05-01, so
 * that content would be stale/misleading on a certification platform.
 *
 * Run with: npx ts-node prisma/seed-tensorflow-deep-learning.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  { title: "Foundations", lessons: [
    { file: "00_tensorflow_fundamentals.ipynb", title: "Getting Started with TensorFlow: A Guide to the Fundamentals" },
    { file: "01_neural_network_regression_in_tensorflow.ipynb", title: "Neural Network Regression with TensorFlow" },
    { file: "02_neural_network_classification_in_tensorflow.ipynb", title: "Neural Network Classification with TensorFlow" },
  ] },
  { title: "Computer Vision", lessons: [
    { file: "03_convolutional_neural_networks_in_tensorflow.ipynb", title: "Convolutional Neural Networks and Computer Vision with TensorFlow" },
    { file: "04_transfer_learning_in_tensorflow_part_1_feature_extraction.ipynb", title: "Transfer Learning with TensorFlow Part 1: Feature Extraction" },
    { file: "05_transfer_learning_in_tensorflow_part_2_fine_tuning.ipynb", title: "Transfer Learning with TensorFlow Part 2: Fine-Tuning" },
    { file: "06_transfer_learning_in_tensorflow_part_3_scaling_up.ipynb", title: "Transfer Learning with TensorFlow Part 3: Scaling Up" },
    { file: "07_food_vision_milestone_project_1.ipynb", title: "Milestone Project: Food Vision Big" },
  ] },
  { title: "Natural Language Processing", lessons: [
    { file: "08_introduction_to_nlp_in_tensorflow.ipynb", title: "Natural Language Processing with TensorFlow" },
    { file: "09_SkimLit_nlp_milestone_project_2.ipynb", title: "Milestone Project: SkimLit NLP" },
  ] },
  { title: "Time Series", lessons: [
    { file: "10_time_series_forecasting_in_tensorflow.ipynb", title: "Milestone Project: Time Series Forecasting with TensorFlow" },
  ] },
];

async function main() {
  console.log("🌱  Seeding TensorFlow for Deep Learning course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "tensorflow-deep-learning" },
    update: {},
    create: {
      slug: "tensorflow-deep-learning",
      title: "TensorFlow for Deep Learning",
      subtitle: "A hands-on, code-first introduction to deep learning with TensorFlow",
      description: "From TensorFlow fundamentals and neural network regression/classification through convolutional networks, transfer learning, NLP, and time series forecasting — three real milestone projects included.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 32,
      pdu_value: 20,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A hands-on, code-first introduction to deep learning with TensorFlow",
        description: "From TensorFlow fundamentals and neural network regression/classification through convolutional networks, transfer learning, NLP, and time series forecasting — three real milestone projects included.",
        overview_headline: "What You'll Learn",
        overview_body: "TensorFlow for Deep Learning takes you from tensor fundamentals through regression, classification, convolutional networks and transfer learning for computer vision, NLP, and time series forecasting — including three milestone projects: Food Vision, SkimLit, and BitPredict.",
        learning_outcomes: [
          "Work confidently with TensorFlow tensors and the Keras API",
          "Build neural networks for regression and classification",
          "Apply convolutional networks and transfer learning to computer vision",
          "Build NLP models for text classification",
          "Forecast time series data with TensorFlow",
          "Complete three real milestone projects end to end",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "TensorFlow fundamentals, regression, and classification." },
          { title: "Step 2: Computer Vision", description: "CNNs and transfer learning, culminating in the Food Vision project." },
          { title: "Step 3: NLP", description: "Text classification, culminating in the SkimLit project." },
          { title: "Step 4: Time Series", description: "Forecasting with the BitPredict project." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson is a runnable notebook — read the narrative, then work through the code yourself in the linked lab.",
        training_exam_prep_items: ["Linked hands-on notebook labs", "Real TensorFlow/Keras code throughout", "Three complete milestone projects"],
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
    for (const l of modDef.lessons) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title: l.title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 40, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${l.title}`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
