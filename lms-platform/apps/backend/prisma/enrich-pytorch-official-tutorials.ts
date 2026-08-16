/**
 * Enriches PyTorch: Official Tutorials: fetches each lesson's tutorial
 * page and saves it as the lesson's content (1 page per lesson, no
 * aggregation needed — each tutorial page is already lesson-sized).
 *
 * Run with: npx ts-node prisma/enrich-pytorch-official-tutorials.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { fetchPytorchTutorialMarkdown } from "./pytorch-docsite-lib";

const prisma = new PrismaClient();
const identity = (html: string) => html;

const MODULES = [
  {
    title: "Learn the Basics",
    lessons: [
      { title: "Quickstart", href: "/tutorials/beginner/basics/quickstart_tutorial.html" },
      { title: "Tensors", href: "/tutorials/beginner/basics/tensorqs_tutorial.html" },
      { title: "Datasets and DataLoaders", href: "/tutorials/beginner/basics/data_tutorial.html" },
      { title: "Transforms", href: "/tutorials/beginner/basics/transforms_tutorial.html" },
      { title: "Build the Neural Network", href: "/tutorials/beginner/basics/buildmodel_tutorial.html" },
      { title: "Automatic Differentiation with torch.autograd", href: "/tutorials/beginner/basics/autogradqs_tutorial.html" },
      { title: "Optimizing Model Parameters", href: "/tutorials/beginner/basics/optimization_tutorial.html" },
      { title: "Save, Load and Use Model", href: "/tutorials/beginner/basics/saveloadrun_tutorial.html" },
    ],
  },
  {
    title: "Additional Foundations",
    lessons: [
      { title: "Learning PyTorch with Examples", href: "/tutorials/beginner/pytorch_with_examples.html" },
      { title: "What Is torch.nn Really?", href: "/tutorials/beginner/nn_tutorial.html" },
    ],
  },
];

async function main() {
  console.log("🌱  Enriching PyTorch: Official Tutorials…\n");
  const course = await prisma.course.findUnique({ where: { slug: "pytorch-official-tutorials" } });
  if (!course) throw new Error("Run seed-pytorch-official-tutorials.ts first");

  let updated = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) { console.warn(`⚠ Module not found: ${modDef.title}`); continue; }
    for (const lessonDef of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonDef.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonDef.title}`); continue; }

      const md = await fetchPytorchTutorialMarkdown(lessonDef.href);
      if (!md) { console.warn(`⚠ Failed to fetch: ${lessonDef.href}`); continue; }

      const blocks = buildLessonBlocksFromReadme(md, "", identity);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonDef.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
