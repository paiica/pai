/**
 * Seeds "Python for Beginners: From Zero to Hero" — an original,
 * self-authored 10-week course (not imported from an external source).
 * Creates the course, 10 modules, and every lesson/sublesson shell.
 * Content is populated separately by enrich-pzth-module{N}.ts scripts
 * (one per module, given the volume) — this script only builds
 * structure so the whole course exists and is navigable immediately,
 * matching the seed/enrich split used for every other course this
 * session.
 *
 * Gamification (XP, levels, badges, weekly missions) has no backend
 * model in this platform (confirmed: no Badge/XP/Achievement table
 * exists) — it's woven into lesson titles/content as thematic framing
 * only, not a tracked system. Quizzes use the real QuizQuestion model
 * (graded, backed by the platform's actual quiz UI). Labs use the real
 * E2B-backed lab_cells_json mechanism used throughout this session.
 *
 * Run with: npx ts-node prisma/seed-python-zero-to-hero.ts
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
    title: "Module 1 — Welcome to Python & Setup (Week 1) 🚀",
    lessons: [
      { title: "Welcome to Python", type: "reading" },
      { title: "What Is Programming?", type: "reading" },
      { title: "What Is Python?", type: "reading" },
      { title: "Installing Python", type: "reading", sublessons: ["Installing Python on Windows", "Installing Python on macOS"] },
      { title: "Understanding the Terminal", type: "reading" },
      { title: "Running Python", type: "reading" },
      { title: "Creating Your First Python File", type: "reading" },
      { title: "Your First Python Program", type: "reading" },
      { title: "Comments", type: "reading" },
      { title: "Lab: Your First Python Program", type: "reading" },
      { title: "Troubleshooting Python Installation", type: "reading" },
      { title: "Mission: Write Your First Program", type: "reading" },
      { title: "Module 1 Quiz", type: "quiz" },
    ],
  },
  {
    title: "Module 2 — Variables, Data Types & Your First Calculator (Week 2) 🧮",
    lessons: [
      { title: "Week 2 Mission Briefing", type: "reading" },
      { title: "Variables and Assignment", type: "reading" },
      { title: "Data Types: Strings, Numbers, and Booleans", type: "reading" },
      { title: "Arithmetic Operators", type: "reading" },
      { title: "Lab: Build Your First Calculator", type: "reading" },
      { title: "Challenge: Pizza Bill Calculator", type: "reading" },
      { title: "Module 2 Quiz", type: "quiz" },
      { title: "Module 2 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 3 — Input & Interactive Programs (Week 3) 🎮",
    lessons: [
      { title: "Week 3 Mission Briefing", type: "reading" },
      { title: "Getting Input From Users", type: "reading" },
      { title: "Converting Types and f-Strings", type: "reading" },
      { title: "Lab: Build Your Own Interactive Quiz", type: "reading" },
      { title: "Challenge: Choose Your Adventure", type: "reading" },
      { title: "Module 3 Quiz", type: "quiz" },
      { title: "Module 3 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 4 — Decisions & Logic (Week 4) 🧠",
    lessons: [
      { title: "Week 4 Mission Briefing", type: "reading" },
      { title: "Booleans and Comparisons", type: "reading" },
      { title: "if, elif, and else", type: "reading" },
      { title: "Combining Conditions: and, or, not", type: "reading" },
      { title: "Lab: Smart Decision Maker", type: "reading" },
      { title: "Boss Battle: Treasure Hunt", type: "reading" },
      { title: "Module 4 Quiz", type: "quiz" },
      { title: "Module 4 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 5 — Loops (Week 5) 🔁",
    lessons: [
      { title: "Week 5 Mission Briefing", type: "reading" },
      { title: "Why Loops Exist and the for Loop", type: "reading" },
      { title: "The while Loop", type: "reading" },
      { title: "Loop Control: break and continue", type: "reading" },
      { title: "Lab: Number Guessing Game", type: "reading" },
      { title: "Challenge: Multiplication Table Generator", type: "reading" },
      { title: "Module 5 Quiz", type: "quiz" },
      { title: "Module 5 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 6 — Lists & Collections (Week 6) 📋",
    lessons: [
      { title: "Week 6 Mission Briefing", type: "reading" },
      { title: "Introduction to Lists", type: "reading" },
      { title: "Modifying Lists: Add, Remove, Sort", type: "reading" },
      { title: "Looping Through Lists, Plus Tuples", type: "reading" },
      { title: "Lab: Build a To-Do List", type: "reading" },
      { title: "Challenge: Upgrade Your To-Do List", type: "reading" },
      { title: "Module 6 Quiz", type: "quiz" },
      { title: "Module 6 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 7 — Dictionaries, Sets & Data (Week 7) 🗂️",
    lessons: [
      { title: "Week 7 Mission Briefing", type: "reading" },
      { title: "Introduction to Dictionaries", type: "reading" },
      { title: "Working With Dictionaries", type: "reading" },
      { title: "Sets and Choosing the Right Collection", type: "reading" },
      { title: "Lab: Student Gradebook", type: "reading" },
      { title: "Challenge: Menu-Driven Gradebook", type: "reading" },
      { title: "Module 7 Quiz", type: "quiz" },
      { title: "Module 7 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 8 — Functions (Week 8) 🛠️",
    lessons: [
      { title: "Week 8 Mission Briefing", type: "reading" },
      { title: "Why Functions Matter", type: "reading" },
      { title: "Parameters, Arguments, and Return Values", type: "reading" },
      { title: "Default Parameters and Scope", type: "reading" },
      { title: "Lab: Utility Toolkit", type: "reading" },
      { title: "Challenge: Refactor With Functions", type: "reading" },
      { title: "Module 8 Quiz", type: "quiz" },
      { title: "Module 8 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 9 — Files, Errors & Debugging (Week 9) 🕵️",
    lessons: [
      { title: "Week 9 Mission Briefing", type: "reading" },
      { title: "Reading and Writing Files", type: "reading" },
      { title: "Handling Errors With try/except", type: "reading" },
      { title: "Debugging Detective: Reading Error Messages", type: "reading" },
      { title: "Lab: Persistent To-Do Application", type: "reading" },
      { title: "Debugging Mystery Challenge", type: "reading" },
      { title: "Module 9 Quiz", type: "quiz" },
      { title: "Module 9 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 10 — Capstone: Build Something Real (Week 10) 🏆",
    lessons: [
      { title: "Welcome to Your Capstone", type: "reading" },
      { title: "Review: Everything You've Learned", type: "reading" },
      { title: "Problem, Requirements, and Design", type: "reading" },
      { title: "Choose Your Project", type: "reading" },
      {
        title: "Capstone Lab: Build Your Project", type: "reading",
        sublessons: [
          "Stage 1: Plan the Project", "Stage 2: Create Variables", "Stage 3: Create Data Structures",
          "Stage 4: Add User Input", "Stage 5: Add Conditions", "Stage 6: Add Loops",
          "Stage 7: Create Functions", "Stage 8: Add File Storage", "Stage 9: Test",
          "Stage 10: Debug", "Stage 11: Improve", "Stage 12: Final Submission",
        ],
      },
      { title: "Course Conclusion: Python Beginner to Python Hero", type: "reading" },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding Python for Beginners: From Zero to Hero…\n");
  const course = await prisma.course.upsert({
    where: { slug: "python-zero-to-hero" },
    update: {},
    create: {
      slug: "python-zero-to-hero",
      title: "Python for Beginners: From Zero to Hero",
      subtitle: "A 10-week journey from your first line of code to building a real Python application",
      description: "A complete, hands-on introduction to Python for absolute beginners. Every week you write real, working code — from your very first print() statement through a self-directed capstone project. No prior programming experience required.",
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
        subtitle: "A 10-week journey from your first line of code to building a real Python application",
        description: "A complete, hands-on introduction to Python for absolute beginners. Every week you write real, working code — from your very first print() statement through a self-directed capstone project. No prior programming experience required.",
        overview_headline: "What You'll Learn",
        overview_body: "Python for Beginners: From Zero to Hero takes you from \"I have never written code before\" to \"I can build a useful Python application on my own\" over 10 weeks. You'll install Python, write your first program, learn variables and data types, work with user input, make decisions with conditionals, repeat work with loops, organize data with lists and dictionaries, write your own functions, handle files and errors, and finish by building a real capstone project of your choosing.",
        learning_outcomes: [
          "Install Python and run programs from the terminal on Windows or macOS",
          "Write, save, and execute Python programs, and read and fix common errors",
          "Use variables, data types, and arithmetic to build calculators and converters",
          "Build interactive programs that read and respond to user input",
          "Use conditionals and loops to make programs that think and repeat",
          "Organize data with lists, dictionaries, and sets",
          "Write reusable functions and break large programs into smaller pieces",
          "Read and write files, and handle errors with try/except",
          "Design, build, test, and debug a complete Python application from scratch",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Weeks 1-2: Foundations", description: "Install Python, write your first programs, and learn variables and data types." },
          { title: "Weeks 3-5: Interactivity & Logic", description: "User input, decisions, and loops — programs that think and repeat." },
          { title: "Weeks 6-8: Data & Functions", description: "Lists, dictionaries, sets, and writing your own reusable functions." },
          { title: "Weeks 9-10: Real Programs", description: "Files, error handling, debugging, and a self-directed capstone project." },
        ],
        training_exam_prep_headline: "Learn By Doing",
        training_exam_prep_body: "Every module includes a real, in-browser interactive lab — no local installation required to start coding, though we'll help you set one up too.",
        training_exam_prep_items: [
          "In-browser Python labs in every module (no install required to start)",
          "Progressively harder challenges and a final capstone project",
          "Real graded quizzes every week",
          "Windows and macOS installation walkthroughs included",
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
