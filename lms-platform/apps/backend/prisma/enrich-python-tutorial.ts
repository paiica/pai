/**
 * Enriches The Python Tutorial: fetches each lesson's chapter page and
 * saves it as the lesson's content (1 page per lesson).
 *
 * Run with: npx ts-node prisma/enrich-python-tutorial.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks } from "./course-import-lib";
import { fetchPythonDocsMarkdown } from "./python-docs-lib";

const prisma = new PrismaClient();
const identity = (html: string) => html;

const MODULES = [
  {
    title: "Getting Started",
    lessons: [
      { title: "Whetting Your Appetite", href: "/3/tutorial/appetite.html" },
      { title: "Using the Python Interpreter", href: "/3/tutorial/interpreter.html" },
      { title: "An Informal Introduction to Python", href: "/3/tutorial/introduction.html" },
    ],
  },
  {
    title: "Core Language",
    lessons: [
      { title: "More Control Flow Tools", href: "/3/tutorial/controlflow.html" },
      { title: "Data Structures", href: "/3/tutorial/datastructures.html" },
      { title: "Modules", href: "/3/tutorial/modules.html" },
    ],
  },
  {
    title: "Working with Data",
    lessons: [
      { title: "Input and Output", href: "/3/tutorial/inputoutput.html" },
      { title: "Errors and Exceptions", href: "/3/tutorial/errors.html" },
    ],
  },
  {
    title: "Object-Oriented Python",
    lessons: [
      { title: "Classes", href: "/3/tutorial/classes.html" },
    ],
  },
  {
    title: "Standard Library & Environments",
    lessons: [
      { title: "Brief Tour of the Standard Library", href: "/3/tutorial/stdlib.html" },
      { title: "Brief Tour of the Standard Library — Part II", href: "/3/tutorial/stdlib2.html" },
      { title: "Virtual Environments and Packages", href: "/3/tutorial/venv.html" },
    ],
  },
  {
    title: "Wrapping Up",
    lessons: [
      { title: "What Now?", href: "/3/tutorial/whatnow.html" },
      { title: "Interactive Input Editing and History Substitution", href: "/3/tutorial/interactive.html" },
      { title: "Floating-Point Arithmetic: Issues and Limitations", href: "/3/tutorial/floatingpoint.html" },
      { title: "Appendix", href: "/3/tutorial/appendix.html" },
    ],
  },
];

async function main() {
  console.log("🌱  Enriching The Python Tutorial…\n");
  const course = await prisma.course.findUnique({ where: { slug: "python-tutorial" } });
  if (!course) throw new Error("Run seed-python-tutorial.ts first");

  let updated = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) { console.warn(`⚠ Module not found: ${modDef.title}`); continue; }
    for (const lessonDef of modDef.lessons) {
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonDef.title } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonDef.title}`); continue; }

      const md = await fetchPythonDocsMarkdown(lessonDef.href);
      if (!md) { console.warn(`⚠ Failed to fetch: ${lessonDef.href}`); continue; }

      const blocks = buildLessonBlocksFromReadme(md, "", identity);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonDef.title}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
