/**
 * Seeds "Computer Vision" — Hugging Face's official Community Computer
 * Vision Course, forked at github.com/paiica/computer-vision-course (MIT
 * license). Offered as a FREE course: fills a real gap in PAII's catalog
 * (no dedicated computer vision course existed), and matches the "free
 * tier for courses we're less certain about republishing commercially"
 * policy applied to a few other courses this batch — this one is actually
 * MIT-licensed so that's not the reason here, just aligning with the
 * user's general steer toward making some of these newly-added GitHub
 * resources free value-adds rather than paid content.
 *
 * Structurally very different: 91 individual `.mdx` sub-pages across 14
 * numbered units (confirmed via chapters/en/_toctree.yml), each sub-page
 * only a few paragraphs on one specific architecture/technique (e.g.
 * "MobileNet", "YOLO", "DETR"). Too granular for one lesson per sub-page
 * (91 lessons), so each UNIT becomes one lesson aggregating all its
 * sub-pages in toctree order — same "aggregate under one lesson" choice
 * made for mcp-for-beginners's large topic folders.
 *
 * Run with: npx ts-node prisma/seed-computer-vision-course.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export interface UnitDef { title: string; pages: { title: string; local: string }[] }

export async function fetchToctree(): Promise<UnitDef[]> {
  const res = await fetch("https://raw.githubusercontent.com/paiica/computer-vision-course/main/chapters/en/_toctree.yml");
  const text = await res.text();
  const units: UnitDef[] = [];
  let current: UnitDef | null = null;
  for (const line of text.split("\n")) {
    const unitMatch = line.match(/^- title:\s*(.+)$/);
    if (unitMatch) {
      current = { title: unitMatch[1].trim(), pages: [] };
      units.push(current);
      continue;
    }
    const pageTitleMatch = line.match(/^\s{2}- title:\s*(.+)$/);
    if (pageTitleMatch && current) {
      current.pages.push({ title: pageTitleMatch[1].trim(), local: "" });
      continue;
    }
    const localMatch = line.match(/^\s{4}local:\s*"?([^"\s]+)"?\s*$/);
    if (localMatch && current && current.pages.length) {
      current.pages[current.pages.length - 1].local = localMatch[1];
    }
  }
  return units;
}

export const MODULES = [
  { title: "Foundations", unitTitles: ["Unit 0 - Welcome", "Unit 1 - Fundamentals", "Unit 2 - Convolutional Neural Networks", "Unit 3 - Vision Transformers"] },
  { title: "Advanced Architectures", unitTitles: ["Unit 4 - Multimodal Models", "Unit 5 - Generative Models", "Unit 9 - Model Optimization"] },
  { title: "Core CV Tasks", unitTitles: ["Unit 6 - Basic CV Tasks", "Unit 7 - Video and Video Processing", "Unit 8 - 3D Vision, Scene Rendering and Reconstruction"] },
  { title: "Emerging Topics", unitTitles: ["Unit 10 - Synthetic Data Creation", "Unit 11  - Zero Shot Computer Vision", "Unit 12 - Ethics and Biases", "Unit 13 - Outlook"] },
];

function cleanTitle(unitTitle: string): string {
  return unitTitle.replace(/^Unit\s+\d+\s*-\s*/, "").trim();
}

async function main() {
  console.log("🌱  Seeding Computer Vision course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "computer-vision" },
    update: {},
    create: {
      slug: "computer-vision",
      title: "Computer Vision",
      subtitle: "A free, community-built course covering the full landscape of modern computer vision",
      description: "From CNNs and vision transformers through multimodal and generative models, core CV tasks, video, 3D vision, model optimization, synthetic data, zero-shot CV, and ethics.",
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
        subtitle: "A free, community-built course covering the full landscape of modern computer vision",
        description: "From CNNs and vision transformers through multimodal and generative models, core CV tasks, video, 3D vision, model optimization, synthetic data, zero-shot CV, and ethics.",
        overview_headline: "What You'll Learn",
        overview_body: "Computer Vision takes you from CNN and vision transformer fundamentals through multimodal and generative models, core tasks like detection and segmentation, video processing, 3D vision, model optimization, synthetic data, zero-shot CV, and ethics and biases in vision systems.",
        learning_outcomes: [
          "Understand CNN and vision transformer architectures",
          "Work with multimodal and generative vision models",
          "Apply core CV tasks: classification, detection, and segmentation",
          "Understand video processing and 3D vision techniques",
          "Optimize models and generate synthetic training data",
          "Recognize ethical considerations and biases in vision systems",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "CNNs and vision transformers." },
          { title: "Step 2: Advanced Architectures", description: "Multimodal, generative, and optimized models." },
          { title: "Step 3: Core CV Tasks", description: "Detection, segmentation, video, and 3D vision." },
          { title: "Step 4: Emerging Topics", description: "Synthetic data, zero-shot CV, and ethics." },
        ],
        training_exam_prep_headline: "Community-Built, Broad Coverage",
        training_exam_prep_body: "Official Hugging Face community course spanning the full modern computer vision landscape.",
        training_exam_prep_items: ["Free course", "Official Hugging Face curriculum", "Covers architectures from CNNs through modern vision transformers"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) { console.log(`✓ Modules already exist (skipped)\n✅  Done.\n`); return; }

  const units = await fetchToctree();
  console.log(`Fetched ${units.length} units from toctree.\n`);

  let moduleSortOrder = 1, totalLessons = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.create({
      data: { course_id: course.id, title: modDef.title, description: "", sort_order: moduleSortOrder++, is_published: true },
    });
    let lessonSortOrder = 1;
    for (const unitTitle of modDef.unitTitles) {
      const unit = units.find((u) => u.title === unitTitle);
      if (!unit) { console.warn(`⚠ Unit not found in toctree: ${unitTitle}`); continue; }
      const title = cleanTitle(unit.title);
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 45, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${title}  (${unit.pages.length} sub-pages)`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
