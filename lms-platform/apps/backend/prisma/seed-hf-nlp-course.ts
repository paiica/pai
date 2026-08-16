/**
 * Seeds "Hugging Face NLP Course: Transformer Fundamentals" — forked at
 * github.com/paiica/course (upstream huggingface/course, Apache 2.0).
 * Content lives as plain Markdown (.mdx) under chapters/en/. The
 * upstream course has 13 chapters, but chapters 5-12 cover specialized
 * tooling (Datasets/Tokenizers libraries, Argilla, Gradio demos, LoRA
 * fine-tuning, GRPO/reasoning models) beyond an "introductory
 * foundations" scope — this import is deliberately scoped to Chapters
 * 0-4, which Hugging Face's own course structure frames as "Part 1:
 * the main concepts of the Transformers library." End-of-chapter quiz
 * pages and completion-marker stub pages are skipped.
 *
 * Run with: npx ts-node prisma/seed-hf-nlp-course.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  {
    title: "Chapter 0: Setup",
    lessons: [
      { title: "Introduction", path: "chapter0/1" },
    ],
  },
  {
    title: "Chapter 1: Transformer Models",
    lessons: [
      { title: "Introduction", path: "chapter1/1" },
      { title: "Natural Language Processing and Large Language Models", path: "chapter1/2" },
      { title: "Transformers, What Can They Do?", path: "chapter1/3" },
      { title: "How Do Transformers Work?", path: "chapter1/4" },
      { title: "How 🤗 Transformers Solve Tasks", path: "chapter1/5" },
      { title: "Transformer Architectures", path: "chapter1/6" },
      { title: "Inference with LLMs", path: "chapter1/8" },
      { title: "Bias and Limitations", path: "chapter1/9" },
      { title: "Summary", path: "chapter1/10" },
    ],
  },
  {
    title: "Chapter 2: Using 🤗 Transformers",
    lessons: [
      { title: "Introduction", path: "chapter2/1" },
      { title: "Behind the Pipeline", path: "chapter2/2" },
      { title: "Models", path: "chapter2/3" },
      { title: "Tokenizers", path: "chapter2/4" },
      { title: "Handling Multiple Sequences", path: "chapter2/5" },
      { title: "Putting It All Together", path: "chapter2/6" },
      { title: "Basic Usage Completed!", path: "chapter2/7" },
      { title: "Optimized Inference Deployment", path: "chapter2/8" },
    ],
  },
  {
    title: "Chapter 3: Fine-Tuning a Pretrained Model",
    lessons: [
      { title: "Introduction", path: "chapter3/1" },
      { title: "Processing the Data", path: "chapter3/2" },
      { title: "Fine-Tuning a Model with the Trainer API", path: "chapter3/3" },
      { title: "A Full Training Loop", path: "chapter3/4" },
      { title: "Understanding Learning Curves", path: "chapter3/5" },
      { title: "Fine-Tuning, Check!", path: "chapter3/6" },
    ],
  },
  {
    title: "Chapter 4: Sharing Models and Tokenizers",
    lessons: [
      { title: "The Hugging Face Hub", path: "chapter4/1" },
      { title: "Using Pretrained Models", path: "chapter4/2" },
      { title: "Sharing Pretrained Models", path: "chapter4/3" },
      { title: "Building a Model Card", path: "chapter4/4" },
      { title: "Part 1 Completed!", path: "chapter4/5" },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding Hugging Face NLP Course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "hf-nlp-course" },
    update: {},
    create: {
      slug: "hf-nlp-course",
      title: "Hugging Face NLP Course: Transformer Fundamentals",
      subtitle: "The foundational first part of Hugging Face's official NLP course",
      description: "The core concepts of the 🤗 Transformers library: what transformer models are and how they work, using pretrained models and tokenizers, fine-tuning a model with the Trainer API, and sharing models on the Hugging Face Hub.",
      price: 199.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 10,
      pdu_value: 7,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "The foundational first part of Hugging Face's official NLP course",
        description: "The core concepts of the 🤗 Transformers library: what transformer models are and how they work, using pretrained models and tokenizers, fine-tuning a model with the Trainer API, and sharing models on the Hugging Face Hub.",
        overview_headline: "What You'll Learn",
        overview_body: "This course covers Part 1 of Hugging Face's official NLP course: what transformer models are and how they work, using the 🤗 Transformers library for inference, fine-tuning a pretrained model with the Trainer API and a full training loop, and sharing models and tokenizers on the Hugging Face Hub.",
        learning_outcomes: [
          "Understand what transformer models are and how they work",
          "Use 🤗 Transformers pipelines, models, and tokenizers",
          "Handle multiple sequences and combine preprocessing steps",
          "Fine-tune a pretrained model with the Trainer API and a full training loop",
          "Understand learning curves during training",
          "Share pretrained models and tokenizers on the Hugging Face Hub",
        ],
        training_exam_prep_headline: "Official Hugging Face Curriculum",
        training_exam_prep_body: "Hugging Face's own official NLP course — this covers Part 1, the foundational core of the Transformers library.",
        training_exam_prep_items: ["Official Hugging Face curriculum", "Apache 2.0 licensed", "Foundational prerequisite for PAII's advanced NLP and generative AI courses"],
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
    for (const lessonDef of modDef.lessons) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title: lessonDef.title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 25, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${lessonDef.title}`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
