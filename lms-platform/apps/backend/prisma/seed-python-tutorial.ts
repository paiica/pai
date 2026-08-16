/**
 * Seeds "The Python Tutorial" — the official introduction to Python at
 * docs.python.org/3/tutorial, PSF License 2.0 (permissive, covers both
 * software and documentation). 16 official chapters grouped into 6
 * modules by theme; 1 lesson per chapter.
 *
 * Run with: npx ts-node prisma/seed-python-tutorial.ts
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
  console.log("🌱  Seeding The Python Tutorial…\n");
  const course = await prisma.course.upsert({
    where: { slug: "python-tutorial" },
    update: {},
    create: {
      slug: "python-tutorial",
      title: "The Python Tutorial",
      subtitle: "The official introduction to Python, from the Python Software Foundation",
      description: "A ground-up introduction to Python: using the interpreter, control flow, data structures, modules, I/O, error handling, classes, a tour of the standard library, and working with virtual environments.",
      price: 99.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 6,
      pdu_value: 4,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "The official introduction to Python, from the Python Software Foundation",
        description: "A ground-up introduction to Python: using the interpreter, control flow, data structures, modules, I/O, error handling, classes, a tour of the standard library, and working with virtual environments.",
        overview_headline: "What You'll Learn",
        overview_body: "The Python Tutorial is the official, canonical introduction to the Python language — covering the interpreter, core control flow and data structures, modules, input/output, error handling, classes and object-oriented programming, and a tour of the standard library.",
        learning_outcomes: [
          "Use the Python interpreter and write your first programs",
          "Work with control flow tools, lists, dictionaries, and other core data structures",
          "Organize code into modules and packages",
          "Handle input/output and errors and exceptions",
          "Write classes and use object-oriented programming in Python",
          "Navigate the Python standard library and use virtual environments",
        ],
        training_exam_prep_headline: "Official Python Documentation",
        training_exam_prep_body: "The Python Software Foundation's own official tutorial, the canonical starting point for learning Python.",
        training_exam_prep_items: ["Official Python Software Foundation curriculum", "PSF License 2.0", "Foundational prerequisite for PAII's AI-focused Python courses"],
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
          duration_minutes: 25, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
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
