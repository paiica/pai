/**
 * Seeds "Data Science for Beginners" — Microsoft's curriculum (10 weeks, 20
 * lessons), forked at github.com/hassanchamas/Data-Science-For-Beginners.
 * Same two-phase pipeline as ML-For-Beginners (see that file's docblock);
 * uses the shared helpers in course-import-lib.ts.
 *
 * Run with: npx ts-node prisma/seed-data-science-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { makeRepoHelpers, stripMarkdownInline } from "./course-import-lib";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("hassanchamas", "Data-Science-For-Beginners");

export const MODULES = [
  { title: "Week 1: Introduction to Data Science", sectionPath: "1-Introduction", folders: ["01-defining-data-science", "02-ethics", "03-defining-data", "04-stats-and-probability"] },
  { title: "Week 2: Working with Data", sectionPath: "2-Working-With-Data", folders: ["05-relational-databases", "06-non-relational", "07-python", "08-data-preparation"] },
  { title: "Week 3: Data Visualization", sectionPath: "3-Data-Visualization", folders: ["09-visualization-quantities", "10-visualization-distributions", "11-visualization-proportions", "12-visualization-relationships", "13-meaningful-visualizations"] },
  { title: "Week 4: Data Science Lifecycle", sectionPath: "4-Data-Science-Lifecycle", folders: ["14-Introduction", "15-analyzing", "16-communication"] },
  { title: "Week 5: Data Science in the Cloud", sectionPath: "5-Data-Science-In-Cloud", folders: ["17-Introduction", "18-Low-Code", "19-Azure"] },
  { title: "Week 6: Data Science in the Wild", sectionPath: "6-Data-Science-In-Wild", folders: ["20-Real-World-Examples"] },
];

async function resolveTitle(lessonPath: string, folder: string): Promise<string> {
  const md = await fetchText(`${lessonPath}/README.md`);
  const h1 = md?.match(/^#\s+(.+)$/m)?.[1];
  return h1 ? stripMarkdownInline(h1) : folder.replace(/^\d+-/, "").replace(/-/g, " ");
}

async function main() {
  console.log("🌱  Seeding Data Science for Beginners course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "data-science-for-beginners" },
    update: {},
    create: {
      slug: "data-science-for-beginners",
      title: "Data Science for Beginners",
      subtitle: "A 6-week, hands-on introduction to data science",
      description: "Ethics, statistics, working with relational and non-relational data, visualization, the data science lifecycle, and doing data science in the cloud — a practical foundation built on real-world examples.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 30,
      pdu_value: 20,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A 6-week, hands-on introduction to data science",
        description: "Ethics, statistics, working with relational and non-relational data, visualization, the data science lifecycle, and doing data science in the cloud — a practical foundation built on real-world examples.",
        overview_headline: "What You'll Learn",
        overview_body: "Data Science for Beginners takes you from what data science actually is and the ethics behind it, through statistics, working with relational and non-relational data in Python/pandas, data visualization, the full data science lifecycle, and doing data science in the cloud with low-code tools and the Azure ML SDK.",
        learning_outcomes: [
          "Define data science and explain the ethical considerations behind it",
          "Apply basic statistics and probability to real datasets",
          "Work with relational and non-relational data using Python and pandas",
          "Build meaningful data visualizations",
          "Apply the full data science lifecycle: analyzing and communicating results",
          "Use low-code tools and the Azure ML SDK for cloud-based data science",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Introduction", description: "Define data science, explore ethics, data, and statistics." },
          { title: "Step 2: Working with Data", description: "Relational and non-relational databases, Python, and data preparation." },
          { title: "Step 3: Data Visualization", description: "Visualize quantities, distributions, proportions, and relationships." },
          { title: "Step 4: Lifecycle & Cloud", description: "The full data science lifecycle and doing data science in the cloud." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson with a notebook links to a runnable lab so you practice each concept in code, not just theory.",
        training_exam_prep_items: ["Module knowledge-check quizzes", "Linked hands-on notebook labs", "pandas, numpy, and visualization libraries", "Real datasets, not toy demos"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) { console.log(`✓ Modules already exist (skipped) — ${existingModules} found\n✅  Done.\n`); return; }

  let moduleSortOrder = 1, totalLessons = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.create({
      data: { course_id: course.id, title: modDef.title, description: "", sort_order: moduleSortOrder++, is_published: true },
    });
    let lessonSortOrder = 1;
    for (const folder of modDef.folders) {
      const lessonPath = `${modDef.sectionPath}/${folder}`;
      const title = await resolveTitle(lessonPath, folder);
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 30, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${title}`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
