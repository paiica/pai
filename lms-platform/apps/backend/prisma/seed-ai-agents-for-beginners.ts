/**
 * Seeds "AI Agents for Beginners" — Microsoft's curriculum (19 lessons),
 * forked at github.com/hassanchamas/ai-agents-for-beginners (MIT license).
 *
 * Same shape as generative-ai-for-beginners: flat top-level numbered
 * folders (not weekly-sectioned), each with a real README.md and a
 * `code_samples/` folder containing per-framework notebooks — the
 * `*-python-agent-framework.ipynb` variant is used where present. Lessons
 * 00 (course setup), 13, 14, and 15 have no notebook (confirmed directly).
 *
 * Run with: npx ts-node prisma/seed-ai-agents-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { makeRepoHelpers, resolveLessonTitle } from "./course-import-lib";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("paiica", "ai-agents-for-beginners");

// notebook: filename within `<folder>/code_samples/`, or null if the
// lesson has none (confirmed directly via the repo's contents API).
export const MODULES = [
  { title: "Foundations", folders: [
    { folder: "00-course-setup", notebook: null },
    { folder: "01-intro-to-ai-agents", notebook: "01-python-agent-framework.ipynb" },
    { folder: "02-explore-agentic-frameworks", notebook: "02-python-agent-framework-azure-openai.ipynb" },
    { folder: "03-agentic-design-patterns", notebook: "03-python-agent-framework.ipynb" },
  ] },
  { title: "Core Techniques", folders: [
    { folder: "04-tool-use", notebook: "04-python-agent-framework.ipynb" },
    { folder: "05-agentic-rag", notebook: "05-python-agent-framework.ipynb" },
    { folder: "06-building-trustworthy-agents", notebook: "06-human-in-the-loop.ipynb" },
    { folder: "07-planning-design", notebook: "07-python-agent-framework.ipynb" },
  ] },
  { title: "Advanced Patterns", folders: [
    { folder: "08-multi-agent", notebook: "08-python-agent-framework.ipynb" },
    { folder: "09-metacognition", notebook: "09-python-agent-framework.ipynb" },
    { folder: "12-context-engineering", notebook: "12-chat_summarization.ipynb" },
    { folder: "13-agent-memory", notebook: null },
  ] },
  { title: "Production & Protocols", folders: [
    { folder: "10-ai-agents-production", notebook: "10-python-agent-framework.ipynb" },
    { folder: "11-agentic-protocols", notebook: "11-a2a-agent-framework.ipynb" },
    { folder: "14-microsoft-agent-framework", notebook: null },
  ] },
  { title: "Deployment & Security", folders: [
    { folder: "15-browser-use", notebook: null },
    { folder: "16-deploying-scalable-agents", notebook: "16-python-agent-framework.ipynb" },
    { folder: "17-creating-local-ai-agents", notebook: "17-local-agent-foundry-local.ipynb" },
    { folder: "18-securing-ai-agents", notebook: "18-signed-receipts.ipynb" },
  ] },
];

async function resolveTitle(folder: string): Promise<string> {
  const md = await fetchText(`${folder}/README.md`);
  return resolveLessonTitle(md, folder);
}

async function main() {
  console.log("🌱  Seeding AI Agents for Beginners course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "ai-agents-for-beginners" },
    update: {},
    create: {
      slug: "ai-agents-for-beginners",
      title: "AI Agents for Beginners",
      subtitle: "A practical guide to building AI agents, from design patterns to production deployment",
      description: "From agentic design patterns and tool use through RAG, planning, multi-agent systems, memory, protocols like MCP and A2A, production observability, and securing deployed agents.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 22,
      pdu_value: 16,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A practical guide to building AI agents, from design patterns to production deployment",
        description: "From agentic design patterns and tool use through RAG, planning, multi-agent systems, memory, protocols like MCP and A2A, production observability, and securing deployed agents.",
        overview_headline: "What You'll Learn",
        overview_body: "AI Agents for Beginners takes you from core agentic design patterns through tool use, agentic RAG, planning, multi-agent systems, metacognition, context engineering and memory, production observability, agentic protocols (MCP, A2A), and deploying and securing agents.",
        learning_outcomes: [
          "Understand core agentic design patterns and frameworks",
          "Build agents that use tools and retrieve information (agentic RAG)",
          "Design multi-agent systems with planning and metacognition",
          "Apply context engineering and memory to agents",
          "Use agentic protocols like MCP and A2A",
          "Deploy, observe, evaluate, and secure agents in production",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "Agent frameworks and core design patterns." },
          { title: "Step 2: Core Techniques", description: "Tool use, agentic RAG, trustworthy agents, and planning." },
          { title: "Step 3: Advanced Patterns", description: "Multi-agent systems, metacognition, context, and memory." },
          { title: "Step 4: Production & Protocols", description: "Observability, evaluation, and agentic protocols." },
          { title: "Step 5: Deployment & Security", description: "Scalable deployment, local agents, and securing agents." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Most lessons link to a runnable notebook — read the narrative, then work through the code yourself in the linked lab.",
        training_exam_prep_items: ["Linked hands-on notebook labs", "Real agent framework code throughout", "Covers current agentic protocols (MCP, A2A)"],
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
    for (const { folder } of modDef.folders) {
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
