/**
 * Seeds "Rules of ML" — Google's official best-practices reference at
 * developers.google.com/machine-learning/guides/rules-of-ml, CC BY 4.0 /
 * Apache 2.0 licensed. Single page, no book-nav at all (unlike every
 * other course this session) — built as a single-module,
 * single-lesson reference course rather than forcing an artificial
 * multi-lesson structure onto one continuous document.
 *
 * Run with: npx ts-node prisma/seed-rules-of-ml.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding Rules of ML…\n");
  const course = await prisma.course.upsert({
    where: { slug: "rules-of-ml" },
    update: {},
    create: {
      slug: "rules-of-ml",
      title: "Rules of ML",
      subtitle: "Google's official best-practices reference for building production ML systems",
      description: "A practical, phase-by-phase reference for engineering machine learning systems: before ML, your first pipeline, feature engineering, and slowed growth / optimization refinement.",
      price: 49.0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 1,
      pdu_value: 1,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "Google's official best-practices reference for building production ML systems",
        description: "A practical, phase-by-phase reference for engineering machine learning systems: before ML, your first pipeline, feature engineering, and slowed growth / optimization refinement.",
        overview_headline: "What You'll Learn",
        overview_body: "Rules of ML is Google's field-tested reference for engineering machine learning systems, organized by phase: before machine learning, your first pipeline and monitoring, feature engineering and human analysis, and slowed growth with optimization refinement and complex models.",
        learning_outcomes: [
          "Decide whether you need machine learning before building it",
          "Build a simple, monitored first ML pipeline",
          "Apply sound feature engineering and human analysis practices",
          "Recognize and address training-serving skew",
          "Know what to do when growth slows and models get more complex",
        ],
        training_exam_prep_headline: "Official Google Curriculum",
        training_exam_prep_body: "Google's own machine learning best-practices reference, used to train engineers across the industry.",
        training_exam_prep_items: ["Official Google curriculum", "CC BY 4.0 licensed", "43 field-tested rules for production ML"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) { console.log(`✓ Modules already exist (skipped)\n✅  Done.\n`); return; }

  const mod = await prisma.module.create({
    data: { course_id: course.id, title: "Rules of ML", description: "", sort_order: 1, is_published: true },
  });
  await prisma.lesson.create({
    data: {
      module_id: mod.id, title: "Rules of Machine Learning: Best Practices for ML Engineering", type: "reading",
      sort_order: 1, duration_minutes: 60, is_published: true, is_free_preview: true,
    },
  });
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: 1 } });
  console.log(`\n✅  Seeded 1 module, 1 lesson.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
