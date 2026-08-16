/**
 * Seeds "Recommendation Systems" — Google's official course at
 * developers.google.com/machine-learning/recommendation, CC BY 4.0 /
 * Apache 2.0 licensed. 3 groups -> 3 units -> 7 content sub-pages,
 * one-unit-per-lesson (same pattern as seed-ml-crash-course.ts).
 *
 * Run with: npx ts-node prisma/seed-recommendation-systems.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { parseDevsiteNav, fetchNavSourceHtml } from "./google-devsite-lib";

const prisma = new PrismaClient();
const ANCHOR_PAGE = "https://developers.google.com/machine-learning/recommendation/content-based/basics";

async function main() {
  console.log("🌱  Seeding Recommendation Systems…\n");
  const course = await prisma.course.upsert({
    where: { slug: "recommendation-systems" },
    update: {},
    create: {
      slug: "recommendation-systems",
      title: "Recommendation Systems",
      subtitle: "Google's official course on building recommendation systems",
      description: "Learn content-based filtering, collaborative filtering with matrix factorization, and deep neural network approaches to recommending items to users.",
      price: 199.0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 4,
      pdu_value: 3,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "Google's official course on building recommendation systems",
        description: "Learn content-based filtering, collaborative filtering with matrix factorization, and deep neural network approaches to recommending items to users.",
        overview_headline: "What You'll Learn",
        overview_body: "Recommendation Systems covers the three main approaches used in production recommenders: content-based filtering, collaborative filtering with matrix factorization, and deep neural network models using softmax.",
        learning_outcomes: [
          "Build content-based filtering recommenders",
          "Apply collaborative filtering and matrix factorization",
          "Understand the trade-offs of each recommendation approach",
          "Use deep neural networks (softmax models) for recommendations",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Content-Based Filtering", description: "Recommend items similar to what a user already liked." },
          { title: "Step 2: Collaborative Filtering", description: "Matrix factorization from user-item interaction patterns." },
          { title: "Step 3: Deep Neural Networks", description: "Softmax models for large-scale recommendation." },
        ],
        training_exam_prep_headline: "Official Google Curriculum",
        training_exam_prep_body: "Google's own machine learning education curriculum, used to train engineers across the industry.",
        training_exam_prep_items: ["Official Google curriculum", "CC BY 4.0 licensed", "Covers content-based, collaborative, and DNN approaches"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) { console.log(`✓ Modules already exist (skipped)\n✅  Done.\n`); return; }

  const navHtml = await fetchNavSourceHtml(ANCHOR_PAGE);
  const groups = parseDevsiteNav(navHtml);
  console.log(`Parsed ${groups.length} groups, ${groups.reduce((a, g) => a + g.units.length, 0)} units.\n`);

  let moduleSortOrder = 1, totalLessons = 0;
  for (const group of groups) {
    const mod = await prisma.module.create({
      data: { course_id: course.id, title: group.heading, description: "", sort_order: moduleSortOrder++, is_published: true },
    });
    let lessonSortOrder = 1;
    for (const unit of group.units) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title: unit.title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: unit.minutes || 30, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${group.heading} / ${unit.title}  (${unit.pages.length} sub-pages)`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${groups.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
