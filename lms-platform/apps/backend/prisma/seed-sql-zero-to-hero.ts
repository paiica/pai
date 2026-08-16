/**
 * Seeds "SQL for Beginners: From Zero to SQL Hero" — an original,
 * self-authored 10-week course. Creates the course, 10 modules, and
 * every lesson/sublesson shell. Content is populated separately by
 * enrich-szth-module{N}.ts scripts, matching the Python course's
 * seed/enrich split.
 *
 * See sql-zero-to-hero-lib.ts for the SQL execution approach (Python's
 * sqlite3 module standing in for a native SQL engine the platform
 * doesn't have) and gamification note (no backend XP/badge model
 * exists — levels/missions are thematic framing in the content only,
 * same as the Python course).
 *
 * Run with: npx ts-node prisma/seed-sql-zero-to-hero.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel, LessonType } from "@prisma/client";

const prisma = new PrismaClient();

export interface LessonDef { title: string; type: "reading" | "quiz"; sublessons?: string[] }
export interface ModuleDef { title: string; lessons: LessonDef[] }

export const MODULES: ModuleDef[] = [
  {
    title: "Module 1 — Welcome to Databases & Your First SQL Query (Week 1) 🗄️",
    lessons: [
      { title: "Welcome to SQL", type: "reading" },
      { title: "What Is Data?", type: "reading" },
      { title: "What Is a Database?", type: "reading" },
      { title: "Meet Our Database", type: "reading" },
      { title: "What Is SQL?", type: "reading" },
      { title: "Your First SQL Query", type: "reading" },
      { title: "Lab: Your First SQL Queries", type: "reading" },
      { title: "SQL Syntax & Common Mistakes", type: "reading" },
      { title: "Mission: Explore the Database", type: "reading" },
      { title: "Module 1 Quiz", type: "quiz" },
      { title: "Module 1 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 2 — SELECT, Filter & Sort (Week 2) 🔎",
    lessons: [
      { title: "Week 2 Mission Briefing", type: "reading" },
      { title: "Selecting Columns and DISTINCT", type: "reading" },
      { title: "Filtering with WHERE", type: "reading" },
      { title: "Sorting with ORDER BY", type: "reading" },
      { title: "Lab: Data Detective", type: "reading" },
      { title: "Challenge: Top 5 and More", type: "reading" },
      { title: "Module 2 Quiz", type: "quiz" },
      { title: "Module 2 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 3 — Conditions, Pattern Matching & NULLs (Week 3) 🎯",
    lessons: [
      { title: "Week 3 Mission Briefing", type: "reading" },
      { title: "Combining Conditions: AND, OR, NOT", type: "reading" },
      { title: "IN and BETWEEN", type: "reading" },
      { title: "Pattern Matching with LIKE", type: "reading" },
      { title: "Understanding NULL", type: "reading" },
      { title: "Lab: SQL Filter Challenge", type: "reading" },
      { title: "Boss Battle: The Missing Records", type: "reading" },
      { title: "Module 3 Quiz", type: "quiz" },
      { title: "Module 3 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 4 — Calculations, Functions & Aliasing (Week 4) 📊",
    lessons: [
      { title: "Week 4 Mission Briefing", type: "reading" },
      { title: "Calculated Columns and Aliases", type: "reading" },
      { title: "Aggregate Functions: COUNT, SUM, AVG, MIN, MAX", type: "reading" },
      { title: "String, Numeric, and Date Functions", type: "reading" },
      { title: "Lab: Business Analyst", type: "reading" },
      { title: "Challenge: Sales Summary", type: "reading" },
      { title: "Module 4 Quiz", type: "quiz" },
      { title: "Module 4 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 5 — GROUP BY & HAVING (Week 5) 📈",
    lessons: [
      { title: "Week 5 Mission Briefing", type: "reading" },
      { title: "Why Grouping Matters: GROUP BY", type: "reading" },
      { title: "Filtering Groups with HAVING", type: "reading" },
      { title: "WHERE vs HAVING", type: "reading" },
      { title: "Lab: Sales Analyst", type: "reading" },
      { title: "Challenge: Top-Performing Categories", type: "reading" },
      { title: "Module 5 Quiz", type: "quiz" },
      { title: "Module 5 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 6 — JOINs: Connecting Tables (Week 6) 🔗",
    lessons: [
      { title: "Week 6 Mission Briefing", type: "reading" },
      { title: "Keys and Relationships", type: "reading" },
      { title: "INNER JOIN", type: "reading" },
      { title: "LEFT JOIN", type: "reading" },
      { title: "RIGHT JOIN and FULL OUTER JOIN", type: "reading" },
      { title: "Lab: Join Master", type: "reading" },
      { title: "Boss Battle: The Full Picture", type: "reading" },
      { title: "Module 6 Quiz", type: "quiz" },
      { title: "Module 6 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 7 — Multi-Table Analysis & Subqueries (Week 7) 🕵️",
    lessons: [
      { title: "Week 7 Mission Briefing", type: "reading" },
      { title: "Joining Three or More Tables", type: "reading" },
      { title: "Subqueries with IN", type: "reading" },
      { title: "Scalar Subqueries", type: "reading" },
      { title: "Lab: Advanced Data Detective", type: "reading" },
      { title: "Challenge: Above-Average Spenders", type: "reading" },
      { title: "Module 7 Quiz", type: "quiz" },
      { title: "Module 7 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 8 — INSERT, UPDATE, DELETE & Data Management (Week 8) 🛠️",
    lessons: [
      { title: "Week 8 Mission Briefing", type: "reading" },
      { title: "Adding Data with INSERT", type: "reading" },
      { title: "Modifying Data with UPDATE", type: "reading" },
      { title: "Removing Data with DELETE (Carefully)", type: "reading" },
      { title: "Lab: Database Manager", type: "reading" },
      { title: "Challenge: Clean Up the Data", type: "reading" },
      { title: "Module 8 Quiz", type: "quiz" },
      { title: "Module 8 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 9 — Advanced Querying, CASE & Data Analysis (Week 9) 🧠",
    lessons: [
      { title: "Week 9 Mission Briefing", type: "reading" },
      { title: "CASE: Conditional Logic in SQL", type: "reading" },
      { title: "Common Table Expressions with WITH", type: "reading" },
      { title: "Window Functions: ROW_NUMBER and RANK", type: "reading" },
      { title: "Lab: SQL Analyst Challenge", type: "reading" },
      { title: "Debugging Challenge", type: "reading" },
      { title: "Module 9 Quiz", type: "quiz" },
      { title: "Module 9 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 10 — SQL Capstone: Solve a Real Business Problem (Week 10) 🏆",
    lessons: [
      { title: "Welcome to Your Capstone", type: "reading" },
      { title: "Review: Everything You've Learned", type: "reading" },
      { title: "From Business Question to Insight", type: "reading" },
      { title: "The Capstone Scenario", type: "reading" },
      {
        title: "Capstone Lab: Analyze DataMart", type: "reading",
        sublessons: ["Customer Analysis", "Product Analysis", "Sales Analysis", "Performance Analysis", "Final Deliverable"],
      },
      { title: "Course Conclusion: SQL Beginner to SQL Hero", type: "reading" },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding SQL for Beginners: From Zero to SQL Hero…\n");
  const course = await prisma.course.upsert({
    where: { slug: "sql-zero-to-hero" },
    update: {},
    create: {
      slug: "sql-zero-to-hero",
      title: "SQL for Beginners: From Zero to SQL Hero",
      subtitle: "A 10-week journey from your first query to independently analyzing real business data",
      description: "A complete, hands-on introduction to SQL for absolute beginners. Every week you write real, working queries against a consistent fictional retail database — from your very first SELECT through a capstone business analysis. No prior database experience required.",
      price: 149.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 30,
      pdu_value: 20,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A 10-week journey from your first query to independently analyzing real business data",
        description: "A complete, hands-on introduction to SQL for absolute beginners. Every week you write real, working queries against a consistent fictional retail database — from your very first SELECT through a capstone business analysis. No prior database experience required.",
        overview_headline: "What You'll Learn",
        overview_body: "SQL for Beginners: From Zero to SQL Hero takes you from \"I have never used SQL or a database\" to \"I can independently query, analyze, join, manipulate, and summarize data using SQL\" over 10 weeks, working with a consistent fictional retail database (DataMart) throughout.",
        learning_outcomes: [
          "Understand databases, tables, rows, columns, and relationships",
          "Write SELECT queries with filtering (WHERE), sorting (ORDER BY), and pattern matching (LIKE)",
          "Use aggregate functions and GROUP BY/HAVING to summarize data",
          "Join multiple tables together with INNER, LEFT, RIGHT, and FULL OUTER JOIN",
          "Write subqueries and multi-table analytical queries",
          "Safely add, modify, and delete data with INSERT, UPDATE, and DELETE",
          "Use CASE, common table expressions, and window functions for analysis",
          "Translate a real business question into SQL, and SQL results into a recommendation",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Weeks 1-3: Foundations", description: "Databases, your first queries, filtering, sorting, and NULL handling." },
          { title: "Weeks 4-5: Analysis Basics", description: "Calculations, aggregate functions, GROUP BY, and HAVING." },
          { title: "Weeks 6-7: Connecting Data", description: "JOINs across multiple tables, and subqueries." },
          { title: "Weeks 8-10: Real-World SQL", description: "Data modification, CASE/CTEs/window functions, and a capstone business analysis." },
        ],
        training_exam_prep_headline: "Learn By Querying Real Data",
        training_exam_prep_body: "Every module includes a real, in-browser SQL lab against a consistent fictional retail database — no local setup required to start.",
        training_exam_prep_items: [
          "In-browser SQL labs in every module against a realistic e-commerce database",
          "Progressively harder challenges and a final capstone business analysis",
          "Real graded quizzes every week",
          "Business-question-first teaching throughout",
        ],
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
      const lesson = await prisma.lesson.create({
        data: {
          module_id: mod.id, title: lessonDef.title, type: lessonDef.type as LessonType, sort_order: lessonSortOrder++,
          duration_minutes: 25, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${lessonDef.title}`);

      if (lessonDef.sublessons) {
        let subSortOrder = 1;
        for (const subTitle of lessonDef.sublessons) {
          await prisma.lesson.create({
            data: {
              module_id: mod.id, parent_lesson_id: lesson.id, title: subTitle, type: "reading",
              sort_order: subSortOrder++, is_published: true, visible_in_structure: false,
              duration_minutes: 15,
            },
          });
          totalLessons++;
          console.log(`      ↳ ${subTitle}`);
        }
      }
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons/sublessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
