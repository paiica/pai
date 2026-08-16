/**
 * Seeds "PyTorch for Deep Learning" — the Zero to Mastery PyTorch course
 * (10 lessons), forked at github.com/hassanchamas/pytorch-deep-learning.
 *
 * Structurally different from the README-based courses: each lesson is a
 * single flat numbered notebook (00-09) whose markdown cells ARE the
 * lesson's narrative content (textbook-style, interleaved with runnable
 * code cells) — confirmed directly, no per-lesson README. Lesson 05 is the
 * one exception, a plain .md file with no notebook/lab.
 *
 * Run with: npx ts-node prisma/seed-pytorch-deep-learning.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  { title: "Foundations", lessons: [
    { file: "00_pytorch_fundamentals.ipynb", title: "PyTorch Fundamentals" },
    { file: "01_pytorch_workflow.ipynb", title: "PyTorch Workflow Fundamentals" },
  ] },
  { title: "Core Deep Learning", lessons: [
    { file: "02_pytorch_classification.ipynb", title: "PyTorch Neural Network Classification" },
    { file: "03_pytorch_computer_vision.ipynb", title: "PyTorch Computer Vision" },
    { file: "04_pytorch_custom_datasets.ipynb", title: "PyTorch Custom Datasets" },
    { file: "05_pytorch_going_modular.md", title: "PyTorch Going Modular" },
  ] },
  { title: "Advanced Techniques", lessons: [
    { file: "06_pytorch_transfer_learning.ipynb", title: "PyTorch Transfer Learning" },
    { file: "07_pytorch_experiment_tracking.ipynb", title: "PyTorch Experiment Tracking" },
    { file: "08_pytorch_paper_replicating.ipynb", title: "PyTorch Paper Replicating" },
  ] },
  { title: "Production", lessons: [
    { file: "09_pytorch_model_deployment.ipynb", title: "PyTorch Model Deployment" },
  ] },
];

async function main() {
  console.log("🌱  Seeding PyTorch for Deep Learning course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "pytorch-deep-learning" },
    update: {},
    create: {
      slug: "pytorch-deep-learning",
      title: "PyTorch for Deep Learning",
      subtitle: "A hands-on, code-first introduction to deep learning with PyTorch",
      description: "From tensors and the PyTorch workflow through neural network classification, computer vision, custom datasets, transfer learning, experiment tracking, and deploying a model to production — a practical, code-first path through PyTorch.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 30,
      pdu_value: 20,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A hands-on, code-first introduction to deep learning with PyTorch",
        description: "From tensors and the PyTorch workflow through neural network classification, computer vision, custom datasets, transfer learning, experiment tracking, and deploying a model to production — a practical, code-first path through PyTorch.",
        overview_headline: "What You'll Learn",
        overview_body: "PyTorch for Deep Learning takes you from tensor fundamentals through the full PyTorch workflow: classification, computer vision, custom datasets, going modular, transfer learning, experiment tracking, replicating a research paper, and deploying a model.",
        learning_outcomes: [
          "Work confidently with PyTorch tensors and the core PyTorch workflow",
          "Build neural networks for classification and computer vision tasks",
          "Load and work with custom datasets",
          "Apply transfer learning and track experiments",
          "Replicate a research paper's model architecture in code",
          "Deploy a trained PyTorch model",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "Tensors and the core PyTorch workflow." },
          { title: "Step 2: Core Deep Learning", description: "Classification, computer vision, custom datasets, and modular code." },
          { title: "Step 3: Advanced Techniques", description: "Transfer learning, experiment tracking, and paper replication." },
          { title: "Step 4: Production", description: "Deploying a trained PyTorch model." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson is a runnable notebook — read the narrative, then work through the code yourself in the linked lab.",
        training_exam_prep_items: ["Linked hands-on notebook labs", "Real PyTorch code throughout", "Progressive, code-first curriculum"],
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
