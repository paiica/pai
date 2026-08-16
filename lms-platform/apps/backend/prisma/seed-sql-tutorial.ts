/**
 * Seeds "Introduction to SQL" — the official PostgreSQL tutorial at
 * postgresql.org/docs/current/tutorial.html, PostgreSQL License
 * (BSD/MIT-style, permissive, explicitly covers "this software and
 * its documentation"). 3 chapters, 20 sections; chapter-index pages
 * (brief intro blurbs) are joined into their first section's lesson
 * rather than left as near-empty standalone lessons.
 *
 * Run with: npx ts-node prisma/seed-sql-tutorial.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

const MODULES = [
  {
    title: "Getting Started",
    lessons: [
      { title: "Getting Started", hrefs: ["tutorial-start.html", "tutorial-install.html"] },
      { title: "Architectural Fundamentals", hrefs: ["tutorial-arch.html"] },
      { title: "Creating a Database", hrefs: ["tutorial-createdb.html"] },
      { title: "Accessing a Database", hrefs: ["tutorial-accessdb.html"] },
    ],
  },
  {
    title: "The SQL Language",
    lessons: [
      { title: "Introduction & Concepts", hrefs: ["tutorial-sql.html", "tutorial-sql-intro.html", "tutorial-concepts.html"] },
      { title: "Creating a New Table", hrefs: ["tutorial-table.html"] },
      { title: "Populating a Table With Rows", hrefs: ["tutorial-populate.html"] },
      { title: "Querying a Table", hrefs: ["tutorial-select.html"] },
      { title: "Joins Between Tables", hrefs: ["tutorial-join.html"] },
      { title: "Aggregate Functions", hrefs: ["tutorial-agg.html"] },
      { title: "Updates", hrefs: ["tutorial-update.html"] },
      { title: "Deletions", hrefs: ["tutorial-delete.html"] },
    ],
  },
  {
    title: "Advanced Features",
    lessons: [
      { title: "Introduction to Advanced Features", hrefs: ["tutorial-advanced.html", "tutorial-advanced-intro.html"] },
      { title: "Views", hrefs: ["tutorial-views.html"] },
      { title: "Foreign Keys", hrefs: ["tutorial-fk.html"] },
      { title: "Transactions", hrefs: ["tutorial-transactions.html"] },
      { title: "Window Functions", hrefs: ["tutorial-window.html"] },
      { title: "Inheritance", hrefs: ["tutorial-inheritance.html"] },
      { title: "Conclusion", hrefs: ["tutorial-conclusion.html"] },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding Introduction to SQL…\n");
  const course = await prisma.course.upsert({
    where: { slug: "sql-tutorial" },
    update: {},
    create: {
      slug: "sql-tutorial",
      title: "Introduction to SQL",
      subtitle: "The official PostgreSQL tutorial — relational databases and SQL from first principles",
      description: "Learn SQL and relational database fundamentals from the official PostgreSQL documentation: creating databases and tables, querying, joins, aggregates, updates and deletions, then views, foreign keys, transactions, and window functions.",
      price: 99.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 5,
      pdu_value: 4,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "The official PostgreSQL tutorial — relational databases and SQL from first principles",
        description: "Learn SQL and relational database fundamentals from the official PostgreSQL documentation: creating databases and tables, querying, joins, aggregates, updates and deletions, then views, foreign keys, transactions, and window functions.",
        overview_headline: "What You'll Learn",
        overview_body: "Introduction to SQL is the official PostgreSQL tutorial, covering relational database fundamentals from creating your first database and table through querying, joins, and aggregate functions, then advanced features like views, foreign keys, transactions, and window functions.",
        learning_outcomes: [
          "Create and access a relational database",
          "Create tables and populate them with rows",
          "Query tables and join data across tables",
          "Use aggregate functions, updates, and deletions",
          "Understand views, foreign keys, and transactions",
          "Use window functions and table inheritance",
        ],
        training_exam_prep_headline: "Official PostgreSQL Documentation",
        training_exam_prep_body: "The PostgreSQL Global Development Group's own official tutorial, the canonical starting point for learning relational databases and SQL.",
        training_exam_prep_items: ["Official PostgreSQL curriculum", "PostgreSQL License", "Foundational prerequisite for PAII's AI-focused SQL & NoSQL course"],
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
          duration_minutes: 20, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
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
