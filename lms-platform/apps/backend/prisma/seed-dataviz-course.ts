/**
 * Seeds "Data Visualization: From Data to Insight" — an original,
 * self-authored 10-week course. Creates the course, 10 modules, and every
 * lesson/sublesson shell. Content is populated separately by
 * enrich-dataviz-module{N}.ts scripts, matching the Python/SQL "Zero to
 * Hero" courses' seed/enrich split.
 *
 * See dataviz-lib.ts for the DataMart Analytics dataset and a note on what
 * this platform's lab sandbox can/can't render (matplotlib PNG capture: yes;
 * Tableau/Power BI or interactive HTML: no — every "dashboard" lab is a
 * static multi-panel matplotlib figure instead).
 *
 * Run with: npx ts-node prisma/seed-dataviz-course.ts
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
    title: "Module 1 — Why Data Visualization Matters (Week 1) 👀",
    lessons: [
      { title: "Week 1 Mission Briefing: See the Data", type: "reading" },
      { title: "What Is Data Visualization?", type: "reading" },
      { title: "Table vs. Number vs. Chart", type: "reading" },
      { title: "Exploratory vs. Explanatory Visualization", type: "reading" },
      { title: "Lab: See the Data", type: "reading" },
      { title: "Challenge: Choose Without Charting", type: "reading" },
      { title: "Module 1 Quiz", type: "quiz" },
      { title: "Module 1 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 2 — Understanding Data & Visual Encoding (Week 2) 🎨",
    lessons: [
      { title: "Week 2 Mission Briefing: Master Visual Encodings", type: "reading" },
      { title: "Types of Data", type: "reading" },
      { title: "What Is Visual Encoding?", type: "reading" },
      { title: "Lab: Visual Encoding Challenge", type: "reading" },
      { title: "Challenge: Rank the Encodings", type: "reading" },
      { title: "Module 2 Quiz", type: "quiz" },
      { title: "Module 2 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 3 — Choosing the Right Chart (Week 3) 🧩",
    lessons: [
      { title: "Week 3 Mission Briefing: Choose the Right Chart", type: "reading" },
      { title: "Charts for Comparison and Trend", type: "reading" },
      { title: "Charts for Relationship and Distribution", type: "reading" },
      { title: "Charts for Composition and Geography", type: "reading" },
      { title: "The Chart Decision Framework", type: "reading" },
      { title: "Lab: Chart Selection Challenge", type: "reading" },
      { title: "Visualization Makeover: Wrong Chart, Right Chart", type: "reading" },
      { title: "Module 3 Quiz", type: "quiz" },
      { title: "Module 3 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 4 — Matplotlib & Seaborn (Week 4) 🐍",
    lessons: [
      { title: "Week 4 Mission Briefing: Build Your First Visualizations", type: "reading" },
      { title: "Matplotlib Fundamentals: Anatomy of a Chart", type: "reading" },
      { title: "Building Core Charts with Matplotlib", type: "reading" },
      { title: "Seaborn: Statistical Visualization Made Easy", type: "reading" },
      { title: "Lab: Five Charts, Five Questions", type: "reading" },
      { title: "Challenge: Choose Your Own Charts", type: "reading" },
      { title: "Module 4 Quiz", type: "quiz" },
      { title: "Module 4 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 5 — Design Principles & Visual Clarity (Week 5) ✨",
    lessons: [
      { title: "Week 5 Mission Briefing: Become a Visual Designer", type: "reading" },
      { title: "Simplicity, Hierarchy, and Layout", type: "reading" },
      { title: "Color: Scales, Meaning, and Accessibility", type: "reading" },
      { title: "Misleading Visualizations", type: "reading" },
      { title: "Lab: Redesign for Clarity", type: "reading" },
      { title: "Challenge: Spot the Problem", type: "reading" },
      { title: "Module 5 Quiz", type: "quiz" },
      { title: "Module 5 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 6 — Exploratory Data Visualization (Week 6) 🕵️",
    lessons: [
      { title: "Week 6 Mission Briefing: Discover Hidden Patterns", type: "reading" },
      { title: "EDA Through Visualization: Distribution and Spread", type: "reading" },
      { title: "EDA Through Visualization: Relationships and Segmentation", type: "reading" },
      { title: "Lab: Data Visualization Detective", type: "reading" },
      { title: "Challenge: Five Observations", type: "reading" },
      { title: "Module 6 Quiz", type: "quiz" },
      { title: "Module 6 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 7 — Time-Series & Geographic Visualization (Week 7) 🌎",
    lessons: [
      { title: "Week 7 Mission Briefing: Analyze Time & Place", type: "reading" },
      { title: "Visualizing Trends Over Time", type: "reading" },
      { title: "Visualizing Geographic Patterns", type: "reading" },
      { title: "Lab: Time & Place", type: "reading" },
      { title: "Challenge: When Is a Map Worse Than a Bar Chart?", type: "reading" },
      { title: "Module 7 Quiz", type: "quiz" },
      { title: "Module 7 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 8 — Dashboards & Business Intelligence (Week 8) 📊",
    lessons: [
      { title: "Week 8 Mission Briefing: Build the Dashboard", type: "reading" },
      { title: "What Makes a Dashboard Work", type: "reading" },
      { title: "Designing Effective KPIs", type: "reading" },
      { title: "Business Intelligence Platforms: Tableau and Power BI", type: "reading" },
      { title: "Lab: Build Your First Dashboard", type: "reading" },
      { title: "Challenge: Redesign the Cluttered Dashboard", type: "reading" },
      { title: "Module 8 Quiz", type: "quiz" },
      { title: "Module 8 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 9 — Data Storytelling (Week 9) 📖",
    lessons: [
      { title: "Week 9 Mission Briefing: Tell the Data Story", type: "reading" },
      { title: "From Charts to Stories", type: "reading" },
      { title: "Story Structure: Context, Problem, Evidence, Insight, Action", type: "reading" },
      { title: "Titles and Annotations as Communication", type: "reading" },
      { title: "Lab: Tell the Story", type: "reading" },
      { title: "Challenge: The Executive Briefing", type: "reading" },
      { title: "Module 9 Quiz", type: "quiz" },
      { title: "Module 9 Summary", type: "reading" },
    ],
  },
  {
    title: "Module 10 — Final Visual Analytics Project (Week 10) 🏆",
    lessons: [
      { title: "Welcome to Your Capstone", type: "reading" },
      { title: "Review: Everything You've Learned", type: "reading" },
      { title: "The Capstone Scenario", type: "reading" },
      {
        title: "Capstone Project: DataMart Visual Analytics", type: "reading",
        sublessons: ["Data Understanding & Questions", "Exploratory Visualizations", "Final Visualizations & Dashboard", "Data Story & Recommendations"],
      },
      { title: "Course Conclusion: From Data to Insight", type: "reading" },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding Data Visualization: From Data to Insight…\n");
  const course = await prisma.course.upsert({
    where: { slug: "data-visualization-from-data-to-insight" },
    update: {},
    create: {
      slug: "data-visualization-from-data-to-insight",
      title: "Data Visualization: From Data to Insight",
      subtitle: "A 10-week, project-based path from raw data to a decision-ready visual story",
      description: "A complete, hands-on introduction to data visualization for data analytics and data science students. Every week you build real, rendering charts against a consistent fictional retail dataset — from your first bar chart through a full capstone visual analytics project, using pandas, Matplotlib, and Seaborn.",
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
        subtitle: "A 10-week, project-based path from raw data to a decision-ready visual story",
        description: "A complete, hands-on introduction to data visualization for data analytics and data science students. Every week you build real, rendering charts against a consistent fictional retail dataset — from your first bar chart through a full capstone visual analytics project, using pandas, Matplotlib, and Seaborn.",
        overview_headline: "What You'll Learn",
        overview_body: "Data Visualization: From Data to Insight takes you from \"I can read a chart\" to \"I can choose the right visualization for a question, build it correctly, and use it to make a case\" over 10 weeks — following one workflow throughout: Raw Data → Question → Visual → Interpretation → Insight → Story → Decision.",
        learning_outcomes: [
          "Explain why and when visualization beats a table or a single number",
          "Choose the right chart type for a comparison, trend, distribution, relationship, or geographic question",
          "Build real, rendering charts with pandas, Matplotlib, and Seaborn",
          "Apply design principles — hierarchy, color, accessibility — to make a chart's message clear",
          "Spot and fix misleading visualizations",
          "Use visualization to explore a new dataset and surface real patterns",
          "Visualize time-series and geographic data appropriately",
          "Design a dashboard around real KPIs, not just charts on a page",
          "Turn a set of charts into a coherent, decision-driving data story",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Weeks 1-3: Visual Thinking", description: "Why visualization matters, how data maps to visual encodings, and how to choose the right chart type." },
          { title: "Weeks 4-5: Building & Design", description: "Real charts in Matplotlib and Seaborn, then the design principles that make them clear instead of just pretty." },
          { title: "Weeks 6-7: Finding Patterns", description: "Exploratory visualization, time-series trends, and geographic patterns." },
          { title: "Weeks 8-10: Communicating Impact", description: "Dashboards, KPIs, data storytelling, and a final capstone visual analytics project." },
        ],
        training_exam_prep_headline: "Learn By Building Real, Rendering Charts",
        training_exam_prep_body: "Every module includes an in-browser Python lab — your matplotlib/seaborn charts render as real images the moment you run the cell, against a consistent fictional retail dataset (DataMart Analytics). No local setup required to start.",
        training_exam_prep_items: [
          "In-browser Python visualization labs in every module, charts render for real",
          "Chart-selection, critique, and 'makeover' exercises throughout",
          "Real graded quizzes every week",
          "A final capstone visual analytics project, portfolio-ready",
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
