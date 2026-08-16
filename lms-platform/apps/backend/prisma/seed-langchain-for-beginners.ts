/**
 * Seeds "LangChain for Beginners" — Microsoft's LangChain curriculum (10
 * lessons), forked at github.com/paiica/langchain-for-beginners (MIT
 * license). Flat numbered folders, each with a real README.md, an
 * assignment.md (sibling lesson, same pattern as ML/Data-Science-For-
 * Beginners), and a `code/` folder with several standalone .py demo files
 * (not a notebook) — those become lab cells. `solution/` files are
 * deliberately excluded, same precedent as elsewhere.
 *
 * Run with: npx ts-node prisma/seed-langchain-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { makeRepoHelpers, resolveLessonTitle } from "./course-import-lib";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("paiica", "langchain-for-beginners");

export const MODULES = [
  { title: "Foundations", folders: ["00-course-setup", "01-introduction", "02-chat-models", "03-prompts-messages-outputs"] },
  { title: "Tools & Agents", folders: ["04-function-calling-tools", "05-agents", "06-mcp"] },
  { title: "Retrieval & Production", folders: ["07-documents-embeddings-semantic-search", "08-agentic-rag-systems", "09-deploy-to-microsoft-foundry"] },
];

async function resolveTitle(folder: string): Promise<string> {
  const md = await fetchText(`${folder}/README.md`);
  return resolveLessonTitle(md, folder);
}

async function main() {
  console.log("🌱  Seeding LangChain for Beginners course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "langchain-for-beginners" },
    update: {},
    create: {
      slug: "langchain-for-beginners",
      title: "LangChain for Beginners",
      subtitle: "Build LLM applications with LangChain, from chat models to agentic RAG",
      description: "From chat models and structured outputs through function calling, agents, MCP, embeddings and semantic search, agentic RAG systems, and deploying LangChain agents to production.",
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
        subtitle: "Build LLM applications with LangChain, from chat models to agentic RAG",
        description: "From chat models and structured outputs through function calling, agents, MCP, embeddings and semantic search, agentic RAG systems, and deploying LangChain agents to production.",
        overview_headline: "What You'll Learn",
        overview_body: "LangChain for Beginners takes you from chat models and structured outputs through function calling and tools, building agents, MCP integration, embeddings and semantic search, agentic RAG systems, and deploying LangChain agents to Microsoft Foundry.",
        learning_outcomes: [
          "Work with LangChain chat models, prompts, and structured outputs",
          "Implement function calling and tools",
          "Build LangChain agents",
          "Integrate MCP with LangChain",
          "Build embeddings-based semantic search and agentic RAG systems",
          "Deploy LangChain agents to production",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Foundations", description: "Chat models, prompts, messages, and structured outputs." },
          { title: "Step 2: Tools & Agents", description: "Function calling, building agents, and MCP." },
          { title: "Step 3: Retrieval & Production", description: "Semantic search, agentic RAG, and deployment." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson pairs its concepts with runnable code samples and a companion assignment.",
        training_exam_prep_items: ["Linked hands-on code labs", "Real LangChain code throughout", "Official Microsoft curriculum"],
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
