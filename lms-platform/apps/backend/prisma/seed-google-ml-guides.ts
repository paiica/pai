/**
 * Seeds the 6 flat-nav Google ML education hub guides (Clustering, GAN,
 * Problem Framing, Managing ML Projects, Intro to ML, Text
 * Classification) — see google-ml-guides-config.ts for course/lesson
 * definitions. Each course gets exactly one module.
 *
 * Run with: npx ts-node prisma/seed-google-ml-guides.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus } from "@prisma/client";
import { GUIDE_COURSES } from "./google-ml-guides-config";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding Google ML guide courses…\n");
  for (const def of GUIDE_COURSES) {
    const course = await prisma.course.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        slug: def.slug,
        title: def.title,
        subtitle: def.subtitle,
        description: def.description,
        price: def.price,
        status: CourseStatus.draft,
        level: def.level,
        duration_hours: def.duration_hours,
        pdu_value: def.pdu_value,
        passing_score: 70,
        is_featured: false,
        is_listed: false,
        sort_order: 0,
        content: {
          subtitle: def.subtitle,
          description: def.description,
          overview_headline: def.overview_headline,
          overview_body: def.overview_body,
          learning_outcomes: def.learning_outcomes,
          training_exam_prep_headline: "Official Google Curriculum",
          training_exam_prep_body: "Google's own machine learning education curriculum, used to train engineers across the industry.",
          training_exam_prep_items: ["Official Google curriculum", "CC BY 4.0 licensed"],
        },
      },
    });
    console.log(`✓ Course: ${course.title} (${course.slug})`);

    const existingModules = await prisma.module.count({ where: { course_id: course.id } });
    if (existingModules > 0) { console.log(`  ✓ Modules already exist (skipped)`); continue; }

    const mod = await prisma.module.create({
      data: { course_id: course.id, title: def.moduleTitle, description: "", sort_order: 1, is_published: true },
    });
    let lessonSortOrder = 1;
    for (const lessonDef of def.lessons) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title: lessonDef.title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 20, is_published: true, is_free_preview: lessonSortOrder === 2,
        },
      });
    }
    await prisma.course.update({ where: { id: course.id }, data: { total_lessons: def.lessons.length } });
    console.log(`  ✓ Seeded 1 module, ${def.lessons.length} lessons.`);
  }
  console.log(`\n✅  Done.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
