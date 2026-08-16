/**
 * Seeds "Practical Deep Learning" — the YSDA/HSE/Skoltech graduate DL
 * course, forked at github.com/hassanchamas/Practical_DL (fall25 branch).
 *
 * Notably rougher source material than the polished MOOCs/ZTM courses:
 * most weeks ship several notebook variants (seminar/homework/optional,
 * PyTorch/TensorFlow) with no consistent naming, and few have a real
 * top-level title heading at all (confirmed directly — many first-H1
 * matches are homework sub-headings like "Our data", not titles). One
 * notebook per week was chosen by hand, preferring the PyTorch
 * seminar/practice notebook over homework/optional/TensorFlow variants;
 * titles were authored from the folder name + confirmed notebook content
 * rather than trusted from a fragile in-notebook heading. week09_llm splits
 * into two lessons (prompting vs. PEFT fine-tuning — genuinely distinct
 * techniques). week11_diffusion has no notebook in this repo at all
 * (confirmed: folder contains only a README, which points to an external
 * DreamBooth notebook in a different repo) — that lesson is README-only,
 * with no lab.
 *
 * Run with: npx ts-node prisma/seed-practical-dl.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  { title: "Foundations", lessons: [
    { title: "Backpropagation and Optimization", folder: "week01_backprop", notebook: "backprop.ipynb" },
    { title: "Automatic Differentiation with PyTorch", folder: "week02_autodiff", notebook: "seminar_pytorch.ipynb" },
  ] },
  { title: "Computer Vision", lessons: [
    { title: "Convolutional Neural Networks for Computer Vision", folder: "week03_convnets", notebook: "seminar_pytorch.ipynb" },
    { title: "Fine-Tuning Pretrained Networks", folder: "week04_finetuning", notebook: "seminar_pytorch.ipynb" },
    { title: "Deep Model Interpretability", folder: "week05_interpretability", notebook: "practice.ipynb" },
  ] },
  { title: "NLP & Language Models", lessons: [
    { title: "Word Embeddings and NLP Basics", folder: "week06_nlp", notebook: "seminar.ipynb" },
    { title: "Language Models", folder: "week07_lm", notebook: "seminar.ipynb" },
    { title: "Transformer Architectures", folder: "week08_transformer", notebook: "seminar.ipynb" },
  ] },
  { title: "Working with Large Language Models", lessons: [
    { title: "Prompting Large Language Models", folder: "week09_llm", notebook: "practice_prompting.ipynb" },
    { title: "Parameter-Efficient Fine-Tuning (PEFT)", folder: "week09_llm", notebook: "practice_peft.ipynb" },
    { title: "Efficient LLM Inference", folder: "week12_inference", notebook: "practice.ipynb" },
  ] },
  { title: "Generative Models", lessons: [
    { title: "Generative Adversarial Networks", folder: "week10_generative", notebook: "simple_1d_gan_pytorch.ipynb" },
    { title: "Diffusion Models", folder: "week11_diffusion", notebook: null },
  ] },
  { title: "Reinforcement Learning & Audio", lessons: [
    { title: "Introduction to Reinforcement Learning", folder: "week13_rl", notebook: "intro.ipynb" },
    { title: "Audio and Speech Models", folder: "week14_audio", notebook: "practice.ipynb" },
  ] },
];

async function main() {
  console.log("🌱  Seeding Practical Deep Learning course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "practical-deep-learning" },
    update: {},
    create: {
      slug: "practical-deep-learning",
      title: "Practical Deep Learning",
      subtitle: "A graduate-level, hands-on tour of modern deep learning",
      description: "From backpropagation and PyTorch fundamentals through computer vision, NLP, transformers, prompting and fine-tuning LLMs, efficient inference, generative models, diffusion, reinforcement learning, and audio models.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.advanced,
      duration_hours: 36,
      pdu_value: 24,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A graduate-level, hands-on tour of modern deep learning",
        description: "From backpropagation and PyTorch fundamentals through computer vision, NLP, transformers, prompting and fine-tuning LLMs, efficient inference, generative models, diffusion, reinforcement learning, and audio models.",
        overview_headline: "What You'll Learn",
        overview_body: "Practical Deep Learning is a graduate-level, code-first tour: backpropagation and autodiff, convolutional networks and fine-tuning, interpretability, NLP and transformers, prompting and PEFT for LLMs, efficient inference, GANs and diffusion models, reinforcement learning, and audio models.",
        learning_outcomes: [
          "Implement backpropagation and understand PyTorch's autodiff engine",
          "Build and fine-tune convolutional networks, and interpret what they learn",
          "Work with word embeddings, language models, and transformer architectures",
          "Prompt and parameter-efficiently fine-tune large language models",
          "Apply efficient LLM inference techniques",
          "Build generative models (GANs, diffusion) and reinforcement learning agents",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations & Vision", description: "Backpropagation, autodiff, CNNs, fine-tuning, and interpretability." },
          { title: "Step 2: NLP & Transformers", description: "Word embeddings, language models, and transformer architectures." },
          { title: "Step 3: Large Language Models", description: "Prompting, PEFT fine-tuning, and efficient inference." },
          { title: "Step 4: Generative & RL", description: "GANs, diffusion models, reinforcement learning, and audio models." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson is a runnable notebook — read the narrative, then work through the code yourself in the linked lab.",
        training_exam_prep_items: ["Linked hands-on notebook labs", "Real PyTorch code throughout", "Graduate-level, research-adjacent curriculum"],
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
          duration_minutes: 45, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
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
