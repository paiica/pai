/**
 * Seeds "Introduction to Deep Learning" — MIT 6.S191's lab materials,
 * forked at github.com/hassanchamas/introtodeeplearning.
 *
 * Mixed content shape (confirmed directly, not assumed):
 * - lab1 has a README.md with two clear `## Part N` sections (Intro to
 *   PyTorch/TensorFlow, then Music Generation with RNNs) -> split into 2
 *   lessons, each README-part as its blocks source.
 * - lab2 has NO README -> notebook-as-lesson (title from the notebook
 *   itself), split into its 2 natural parts (MNIST, Debiasing).
 * - lab3 has a README (single topic, no Part split) + one notebook -> one
 *   README-based lesson.
 * - xtra_labs (llm_finetune, rl_pong, rl_selfdriving, uncertainty) are
 *   explicitly bonus/optional material per the repo's own structure —
 *   excluded, same precedent as excluding solution notebooks elsewhere.
 * - Every notebook has PT (PyTorch) and TF (TensorFlow) variants where
 *   both exist; PT is used throughout for consistency with the platform's
 *   existing PyTorch for Deep Learning course.
 *
 * Run with: npx ts-node prisma/seed-introtodeeplearning.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  { title: "Foundations", lessons: [
    { title: "Intro to PyTorch and Deep Learning Computation", kind: "readme-part" as const, folder: "lab1", part: 1, notebook: "lab1/PT_Part1_Intro.ipynb" },
    { title: "Music Generation with RNNs", kind: "readme-part" as const, folder: "lab1", part: 2, notebook: "lab1/PT_Part2_Music_Generation.ipynb" },
  ] },
  { title: "Computer Vision & Fairness", lessons: [
    { title: "MNIST Digit Classification with CNNs", kind: "notebook" as const, notebook: "lab2/PT_Part1_MNIST.ipynb" },
    { title: "Algorithmic Bias and Debiasing", kind: "notebook" as const, notebook: "lab2/PT_Part2_Debiasing.ipynb" },
  ] },
  { title: "Large Language Models", lessons: [
    { title: "Fine-Tuning a Large Language Model", kind: "readme-part" as const, folder: "lab3", part: null, notebook: "lab3/LLM_Finetuning.ipynb" },
  ] },
];

async function main() {
  console.log("🌱  Seeding Introduction to Deep Learning course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "introtodeeplearning" },
    update: {},
    create: {
      slug: "introtodeeplearning",
      title: "Introduction to Deep Learning",
      subtitle: "MIT's hands-on lab curriculum for deep learning, from fundamentals to LLM fine-tuning",
      description: "The lab materials from MIT 6.S191: PyTorch fundamentals, RNN-based music generation, CNNs for MNIST classification, algorithmic bias and debiasing, and fine-tuning a large language model.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 18,
      pdu_value: 12,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "MIT's hands-on lab curriculum for deep learning, from fundamentals to LLM fine-tuning",
        description: "The lab materials from MIT 6.S191: PyTorch fundamentals, RNN-based music generation, CNNs for MNIST classification, algorithmic bias and debiasing, and fine-tuning a large language model.",
        overview_headline: "What You'll Learn",
        overview_body: "Introduction to Deep Learning takes you from PyTorch computation basics through building an RNN that generates music, a CNN for digit classification, techniques for uncovering and correcting algorithmic bias, and a complete pipeline for fine-tuning a large language model.",
        learning_outcomes: [
          "Work with core PyTorch computation and neural network building blocks",
          "Build a recurrent neural network for music generation",
          "Build a convolutional neural network for image classification",
          "Diagnose and correct algorithmic bias in a trained model",
          "Fine-tune a large language model and evaluate its outputs",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "PyTorch computation basics and RNN-based music generation." },
          { title: "Step 2: Computer Vision & Fairness", description: "CNNs for digit classification, then diagnosing and correcting algorithmic bias." },
          { title: "Step 3: Large Language Models", description: "A complete pipeline for fine-tuning and evaluating an LLM." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson is a runnable notebook — read the narrative, then work through the code yourself in the linked lab.",
        training_exam_prep_items: ["Linked hands-on notebook labs", "Real PyTorch code throughout", "MIT 6.S191 curriculum"],
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
