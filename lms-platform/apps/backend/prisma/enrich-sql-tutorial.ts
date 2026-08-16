/**
 * Enriches Introduction to SQL: fetches each lesson's configured
 * PostgreSQL tutorial page(s) and joins them into the lesson's content.
 *
 * Run with: npx ts-node prisma/enrich-sql-tutorial.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { fetchPostgresDocsMarkdown } from "./postgresql-docs-lib";

const prisma = new PrismaClient();
const identity = (html: string) => html;

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
  console.log("🌱  Enriching Introduction to SQL…\n");
  const course = await prisma.course.findUnique({ where: { slug: "sql-tutorial" } });
  if (!course) throw new Error("Run seed-sql-tutorial.ts first");

  let updated = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) { console.warn(`⚠ Module not found: ${modDef.title}`); continue; }
    for (const lessonDef of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonDef.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonDef.title}`); continue; }

      const pageTexts: string[] = [];
      for (const href of lessonDef.hrefs) {
        const md = await fetchPostgresDocsMarkdown(href);
        if (md) pageTexts.push(md);
      }
      const joined = pageTexts.join("\n\n");
      const blocks = buildLessonBlocksFromReadme(joined, "", identity);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonDef.title}  (${pageTexts.length}/${lessonDef.hrefs.length} pages fetched, ${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
