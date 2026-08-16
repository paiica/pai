/**
 * Seeds "PyTorch: Official Tutorials" — content from
 * docs.pytorch.org/tutorials, BSD-3-Clause licensed
 * (github.com/pytorch/tutorials). Distinct from the existing
 * "PyTorch for Deep Learning" course (learnpytorch.io / Zero to
 * Mastery, a project-driven walkthrough) — this is PyTorch's own
 * from-scratch fundamentals series plus two standalone official deep
 * dives, minimal topical overlap.
 *
 * Run with: npx ts-node prisma/seed-pytorch-official-tutorials.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

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
  console.log("🌱  Seeding PyTorch: Official Tutorials…\n");
  const course = await prisma.course.upsert({
    where: { slug: "pytorch-official-tutorials" },
    update: {},
    create: {
      slug: "pytorch-official-tutorials",
      title: "PyTorch: Official Tutorials",
      subtitle: "PyTorch's own from-scratch guide to tensors, autograd, and training a model",
      description: "Build a complete ML workflow with PyTorch from first principles: tensors, datasets and dataloaders, transforms, building a neural network, automatic differentiation, and the optimization loop — plus two official deep dives into PyTorch's core abstractions.",
      price: 149.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 4,
      pdu_value: 3,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "PyTorch's own from-scratch guide to tensors, autograd, and training a model",
        description: "Build a complete ML workflow with PyTorch from first principles: tensors, datasets and dataloaders, transforms, building a neural network, automatic differentiation, and the optimization loop — plus two official deep dives into PyTorch's core abstractions.",
        overview_headline: "What You'll Learn",
        overview_body: "PyTorch: Official Tutorials walks through the complete ML workflow using PyTorch's own tensors, datasets, transforms, and autograd APIs, then goes deeper into how torch.nn actually works under the hood.",
        learning_outcomes: [
          "Work with PyTorch tensors and datasets/dataloaders",
          "Build and train a neural network with torch.nn",
          "Understand automatic differentiation with torch.autograd",
          "Run the optimization loop and save/load a trained model",
          "Understand what torch.nn is really doing internally",
        ],
        training_exam_prep_headline: "Official PyTorch Documentation",
        training_exam_prep_body: "PyTorch's own official tutorials, maintained by the PyTorch team.",
        training_exam_prep_items: ["Official PyTorch curriculum", "BSD-3-Clause licensed", "Complements PyTorch for Deep Learning with framework-native fundamentals"],
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
