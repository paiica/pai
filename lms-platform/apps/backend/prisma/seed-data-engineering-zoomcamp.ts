/**
 * Seeds "Data Engineering Zoomcamp" — DataTalksClub's free data
 * engineering curriculum (7 modules), forked at
 * github.com/paiica/data-engineering-zoomcamp.
 *
 * Same licensing situation as mlops-zoomcamp (no LICENSE file — offered
 * free with the user's explicit go-ahead despite the unresolved risk).
 *
 * This course is much more SQL/Terraform/infra-code-driven than
 * notebook-driven (confirmed: only module 06-batch has real .ipynb
 * notebooks, via PySpark) — every module is README-based; only 06-batch
 * gets a lab, using its PySpark intro notebook.
 *
 * Run with: npx ts-node prisma/seed-data-engineering-zoomcamp.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { makeRepoHelpers, resolveLessonTitle } from "./course-import-lib";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("paiica", "data-engineering-zoomcamp");

export const MODULES = [
  { title: "Foundations", lessons: [
    { folder: "01-docker-terraform", notebook: null },
    { folder: "02-workflow-orchestration", notebook: null },
    { folder: "03-data-warehouse", notebook: null },
  ] },
  { title: "Analytics & Platforms", lessons: [
    { folder: "04-analytics-engineering", notebook: null },
    { folder: "05-data-platforms", notebook: null },
  ] },
  { title: "Processing at Scale", lessons: [
    { folder: "06-batch", notebook: "code/04_pyspark.ipynb" },
    { folder: "07-streaming", notebook: null },
  ] },
];

function cleanTitle(raw: string): string {
  return raw.replace(/^Module\s+\d+:\s*/i, "").trim();
}

async function resolveTitle(folder: string): Promise<string> {
  const md = await fetchText(`${folder}/README.md`);
  return cleanTitle(resolveLessonTitle(md, folder));
}

async function main() {
  console.log("🌱  Seeding Data Engineering Zoomcamp course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "data-engineering-zoomcamp" },
    update: {},
    create: {
      slug: "data-engineering-zoomcamp",
      title: "Data Engineering Zoomcamp",
      subtitle: "A free, practical course in building production-ready data pipelines",
      description: "From Docker and Terraform through workflow orchestration, data warehousing, analytics engineering, data platforms, and batch and stream processing at scale.",
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
        subtitle: "A free, practical course in building production-ready data pipelines",
        description: "From Docker and Terraform through workflow orchestration, data warehousing, analytics engineering, data platforms, and batch and stream processing at scale.",
        overview_headline: "What You'll Learn",
        overview_body: "Data Engineering Zoomcamp takes you from containerizing and provisioning infrastructure through workflow orchestration, data warehousing with BigQuery, analytics engineering, modern data platforms, and batch and stream processing with PySpark and streaming tools.",
        learning_outcomes: [
          "Containerize pipelines with Docker and provision infrastructure with Terraform",
          "Orchestrate data workflows",
          "Build a data warehouse with BigQuery",
          "Apply analytics engineering practices",
          "Understand modern data platform architecture",
          "Process data in batch with PySpark and in streams",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "Docker/Terraform, orchestration, and data warehousing." },
          { title: "Step 2: Analytics & Platforms", description: "Analytics engineering and modern data platforms." },
          { title: "Step 3: Processing at Scale", description: "Batch processing with PySpark and stream processing." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "A hands-on, project-driven path through the full data engineering lifecycle.",
        training_exam_prep_items: ["Free course", "Real infrastructure and SQL throughout", "Batch processing lab with PySpark"],
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
