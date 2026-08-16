/**
 * Seeds "MLOps Zoomcamp" — DataTalksClub's free MLOps curriculum (7
 * modules), forked at github.com/paiica/mlops-zoomcamp.
 *
 * IMPORTANT — licensing: this repo ships no LICENSE file (confirmed
 * directly), meaning the author retains full copyright and has not
 * granted redistribution rights. Offered as a FREE course per the user's
 * explicit instruction that license-restricted finds should be free
 * value-adds rather than paid content — this reduces but does not
 * eliminate the underlying legal risk; reaching out to DataTalksClub for
 * explicit permission is still worth doing before this goes fully public.
 *
 * README + notebook pattern like the "For Beginners" courses. Modules 06
 * (best practices/CI-CD) and 07 (capstone project) have no notebook —
 * they're testing/deployment scaffolding and a project prompt,
 * respectively — so those two lessons have no lab.
 *
 * Run with: npx ts-node prisma/seed-mlops-zoomcamp.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { makeRepoHelpers, resolveLessonTitle } from "./course-import-lib";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("paiica", "mlops-zoomcamp");

export const MODULES = [
  { title: "Fundamentals", lessons: [
    { folder: "01-intro", notebook: "duration-prediction.ipynb" },
    { folder: "02-experiment-tracking", notebook: "duration-prediction.ipynb" },
    { folder: "03-orchestration", notebook: "code/duration-prediction.ipynb" },
  ] },
  { title: "Production & Practice", lessons: [
    { folder: "04-deployment", notebook: "batch/score.ipynb" },
    { folder: "05-monitoring", notebook: "baseline_model_nyc_taxi_data.ipynb" },
    { folder: "06-best-practices", notebook: null },
    { folder: "07-project", notebook: null },
  ] },
];

function cleanTitle(raw: string): string {
  return raw.replace(/^\d+\.\s*/, "").trim();
}

async function resolveTitle(folder: string): Promise<string> {
  const md = await fetchText(`${folder}/README.md`);
  return cleanTitle(resolveLessonTitle(md, folder));
}

async function main() {
  console.log("🌱  Seeding MLOps Zoomcamp course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "mlops-zoomcamp" },
    update: {},
    create: {
      slug: "mlops-zoomcamp",
      title: "MLOps Zoomcamp",
      subtitle: "A free, practical course in taking ML models to production",
      description: "From experiment tracking and model management through orchestration, deployment, monitoring, and best practices — a hands-on path through the full MLOps lifecycle, ending with a capstone project.",
      price: 0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 20,
      pdu_value: 14,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A free, practical course in taking ML models to production",
        description: "From experiment tracking and model management through orchestration, deployment, monitoring, and best practices — a hands-on path through the full MLOps lifecycle, ending with a capstone project.",
        overview_headline: "What You'll Learn",
        overview_body: "MLOps Zoomcamp takes you from ML pipeline fundamentals through experiment tracking and model management, orchestration, batch and streaming deployment, model monitoring, and MLOps best practices like testing and CI/CD, ending with an end-to-end capstone project.",
        learning_outcomes: [
          "Track experiments and manage models with MLflow",
          "Orchestrate ML pipelines",
          "Deploy models in batch and streaming settings",
          "Monitor deployed models for data and model drift",
          "Apply MLOps best practices: testing, CI/CD, and infrastructure as code",
          "Build a complete end-to-end MLOps project",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Fundamentals", description: "Intro, experiment tracking, and orchestration." },
          { title: "Step 2: Production & Practice", description: "Deployment, monitoring, best practices, and a capstone project." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Most lessons link to a runnable notebook — read the narrative, then work through the code yourself in the linked lab.",
        training_exam_prep_items: ["Free course", "Linked hands-on notebook labs", "Ends with a capstone project"],
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
    for (const { folder } of modDef.lessons) {
      const title = await resolveTitle(folder);
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
