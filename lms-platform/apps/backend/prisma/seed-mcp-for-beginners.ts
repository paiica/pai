/**
 * Seeds "MCP for Beginners" — Microsoft's Model Context Protocol curriculum,
 * forked at github.com/paiica/mcp-for-beginners (MIT license).
 *
 * This repo is fundamentally more conceptual/reference material than
 * hands-on coding (confirmed: chapter READMEs run 7-78KB of prose on
 * protocol architecture, security, and best practices; code that exists is
 * plain multi-language sample files, not notebooks) — no labs are built
 * for this course, matching the "don't fabricate labs the source doesn't
 * support" precedent from earlier courses this session.
 *
 * Run with: npx ts-node prisma/seed-mcp-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { makeRepoHelpers, resolveLessonTitle } from "./course-import-lib";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("paiica", "mcp-for-beginners");

export const MODULES = [
  { title: "Foundations", folders: ["00-Introduction", "01-CoreConcepts", "03-GettingStarted"] },
  { title: "Building with MCP", folders: ["04-PracticalImplementation", "10-StreamliningAIWorkflowsBuildingAnMCPServerWithAIToolkit", "11-MCPServerHandsOnLabs", "12-tooling"] },
  { title: "Security & Best Practices", folders: ["02-Security", "08-BestPractices"] },
  { title: "Advanced Topics & Real-World Application", folders: ["05-AdvancedTopics", "09-CaseStudy", "06-CommunityContributions", "07-LessonsfromEarlyAdoption"] },
];

async function resolveTitle(folder: string): Promise<string> {
  const md = await fetchText(`${folder}/README.md`);
  return resolveLessonTitle(md, folder);
}

async function main() {
  console.log("🌱  Seeding MCP for Beginners course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "mcp-for-beginners" },
    update: {},
    create: {
      slug: "mcp-for-beginners",
      title: "MCP for Beginners",
      subtitle: "Understand and build with the Model Context Protocol",
      description: "From core MCP concepts and getting started through practical implementation, security, best practices, and real-world case studies of the Model Context Protocol.",
      price: 199.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 14,
      pdu_value: 10,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "Understand and build with the Model Context Protocol",
        description: "From core MCP concepts and getting started through practical implementation, security, best practices, and real-world case studies of the Model Context Protocol.",
        overview_headline: "What You'll Learn",
        overview_body: "MCP for Beginners takes you from core Model Context Protocol concepts through getting started, practical implementation, security, best practices, advanced topics, and real-world case studies.",
        learning_outcomes: [
          "Understand what MCP is and why it matters for scalable AI applications",
          "Master MCP's core concepts and architecture",
          "Implement MCP servers and clients",
          "Apply MCP security best practices",
          "Learn from real-world MCP case studies and early adopters",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "Core concepts and getting started with MCP." },
          { title: "Step 2: Building with MCP", description: "Practical implementation and hands-on server-building." },
          { title: "Step 3: Security & Best Practices", description: "Securing MCP systems and following best practices." },
          { title: "Step 4: Advanced Topics", description: "Advanced topics and real-world case studies." },
        ],
        training_exam_prep_headline: "Grounded in Practice",
        training_exam_prep_body: "Every lesson draws on real MCP implementation guidance and case studies from early adopters.",
        training_exam_prep_items: ["Official Microsoft MCP curriculum", "Covers a current, fast-moving protocol", "Security-focused throughout"],
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
    for (const folder of modDef.folders) {
      const title = await resolveTitle(folder);
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
