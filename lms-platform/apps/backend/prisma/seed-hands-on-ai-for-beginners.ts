/**
 * Seeds "Hands-On Artificial Intelligence for Beginners" — the Packt book's
 * code repo, forked at
 * github.com/hassanchamas/Hands-On-Artificial-Intelligence-for-Beginners.
 *
 * Each chapter has a real README.md with a proper title and substantial
 * prose (confirmed directly) plus a notebook — except chapters 6, 9, 10,
 * 12, and 14, which have NO notebook at all (chapter10/14 ship plain .py
 * scripts instead, chapter6/9/12 are README-only) — those lessons have no
 * lab, same precedent as other README-only lessons built this session.
 * Chapter 7 ("Generative Models") has three distinct notebooks
 * (autoencoder/GAN/VAE) and splits into three lessons.
 *
 * Run with: npx ts-node prisma/seed-hands-on-ai-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  { title: "Foundations", lessons: [
    { title: "Machine Learning Basics", folder: "chapter2", notebook: "Chapter2.ipynb" },
    { title: "Platforms and Other Essentials", folder: "chapter3", notebook: "Chapter3.ipynb" },
    { title: "Your First Artificial Neural Networks", folder: "chapter4", notebook: "Chapter4.ipynb" },
  ] },
  { title: "Computer Vision & Sequence Models", lessons: [
    { title: "Convolutional Neural Networks", folder: "chapter5", notebook: "Chapter5.ipynb" },
    { title: "Recurrent Neural Networks", folder: "chapter6", notebook: null },
  ] },
  { title: "Generative Models", lessons: [
    { title: "Generative Models: Autoencoders", folder: "chapter7", notebook: "building_autoencoder.ipynb" },
    { title: "Generative Models: Generative Adversarial Networks", folder: "chapter7", notebook: "building_gans.ipynb" },
    { title: "Generative Models: Variational Autoencoders", folder: "chapter7", notebook: "building_vae.ipynb" },
  ] },
  { title: "Reinforcement Learning", lessons: [
    { title: "Reinforcement Learning", folder: "chapter8", notebook: "Chapter8.ipynb" },
    { title: "Deep Learning for Intelligent Agents", folder: "chapter9", notebook: null },
    { title: "Deep Learning for Game Playing", folder: "chapter10", notebook: null },
  ] },
  { title: "Applied AI", lessons: [
    { title: "Deep Learning for Finance", folder: "chapter11", notebook: "chap11.ipynb" },
    { title: "Deep Learning for Robotics", folder: "chapter12", notebook: null },
    { title: "Deployment and Maintenance", folder: "chapter14", notebook: null },
  ] },
];

async function main() {
  console.log("🌱  Seeding Hands-On Artificial Intelligence for Beginners course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "hands-on-ai-for-beginners" },
    update: {},
    create: {
      slug: "hands-on-ai-for-beginners",
      title: "Hands-On Artificial Intelligence for Beginners",
      subtitle: "A foundational, code-first tour of core AI techniques",
      description: "From machine learning basics and your first neural network through CNNs, RNNs, generative models, reinforcement learning, and applied AI for finance, robotics, and game playing — with a look at deploying a model to production.",
      price: 199.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 20,
      pdu_value: 14,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A foundational, code-first tour of core AI techniques",
        description: "From machine learning basics and your first neural network through CNNs, RNNs, generative models, reinforcement learning, and applied AI for finance, robotics, and game playing — with a look at deploying a model to production.",
        overview_headline: "What You'll Learn",
        overview_body: "Hands-On Artificial Intelligence for Beginners takes you from machine learning fundamentals through building your first neural network, convolutional and recurrent networks, generative models (autoencoders, GANs, VAEs), reinforcement learning, and applied AI across finance, robotics, and game playing, ending with deployment.",
        learning_outcomes: [
          "Understand core machine learning concepts and the major deep learning frameworks",
          "Build your first artificial neural network, then CNNs and RNNs",
          "Build generative models: autoencoders, GANs, and VAEs",
          "Apply reinforcement learning to intelligent agents and game playing",
          "Apply deep learning to finance and robotics",
          "Understand what it takes to deploy and maintain an AI application",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "Machine learning basics, frameworks, and your first neural network." },
          { title: "Step 2: Computer Vision & Sequence Models", description: "Convolutional and recurrent neural networks." },
          { title: "Step 3: Generative Models", description: "Autoencoders, GANs, and variational autoencoders." },
          { title: "Step 4: Reinforcement Learning & Applied AI", description: "RL for agents and games, then finance, robotics, and deployment." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Most lessons include a runnable notebook — read the narrative, then work through the code yourself in the linked lab.",
        training_exam_prep_items: ["Linked hands-on notebook labs", "Broad, foundational coverage of core AI techniques", "Real code throughout"],
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
