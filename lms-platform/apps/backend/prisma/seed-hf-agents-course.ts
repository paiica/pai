/**
 * Seeds "Hugging Face Agents Course" — forked at github.com/paiica/agents-course
 * (upstream huggingface/agents-course, Apache 2.0). Content lives as
 * plain Markdown (.mdx) under units/en/. Scoped to the main path (Units
 * 0-4); the 3 bonus units (fine-tuning for function-calling, agent
 * observability, agents in Pokemon games) are skipped as lower-priority
 * tangents. Quiz pages use a custom `<Question>` JSX component (not
 * real markdown) and are skipped, matching the precedent of skipping
 * non-fetchable interactive quiz widgets elsewhere this session.
 *
 * Run with: npx ts-node prisma/seed-hf-agents-course.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULES = [
  {
    title: "Unit 0: Welcome to the Course",
    lessons: [
      { title: "Welcome to the Course", path: "unit0/introduction" },
      { title: "Onboarding", path: "unit0/onboarding" },
    ],
  },
  {
    title: "Unit 1: Introduction to Agents",
    lessons: [
      { title: "Introduction", path: "unit1/introduction" },
      { title: "What is an Agent?", path: "unit1/what-are-agents" },
      { title: "What are LLMs?", path: "unit1/what-are-llms" },
      { title: "Messages and Special Tokens", path: "unit1/messages-and-special-tokens" },
      { title: "What are Tools?", path: "unit1/tools" },
      { title: "Understanding AI Agents through the Thought-Action-Observation Cycle", path: "unit1/agent-steps-and-structure" },
      { title: "Thought, Internal Reasoning and the Re-Act Approach", path: "unit1/thoughts" },
      { title: "Actions, Enabling the Agent to Engage with Its Environment", path: "unit1/actions" },
      { title: "Observe, Integrating Feedback to Reflect and Adapt", path: "unit1/observations" },
      { title: "Dummy Agent Library", path: "unit1/dummy-agent-library" },
      { title: "Let's Create Our First Agent Using smolagents", path: "unit1/tutorial" },
      { title: "Unit 1 Conclusion", path: "unit1/conclusion" },
    ],
  },
  {
    title: "Unit 2.1: The smolagents Framework",
    lessons: [
      { title: "Introduction to smolagents", path: "unit2/smolagents/introduction" },
      { title: "Why Use smolagents?", path: "unit2/smolagents/why_use_smolagents" },
      { title: "Building Agents That Use Code", path: "unit2/smolagents/code_agents" },
      { title: "Writing Actions as Code Snippets or JSON Blobs", path: "unit2/smolagents/tool_calling_agents" },
      { title: "Tools", path: "unit2/smolagents/tools" },
      { title: "Retrieval Agents", path: "unit2/smolagents/retrieval_agents" },
      { title: "Multi-Agent Systems", path: "unit2/smolagents/multi_agent_systems" },
      { title: "Vision and Browser Agents", path: "unit2/smolagents/vision_agents" },
      { title: "smolagents Conclusion", path: "unit2/smolagents/conclusion" },
    ],
  },
  {
    title: "Unit 2.2: The LlamaIndex Framework",
    lessons: [
      { title: "Introduction to LlamaIndex", path: "unit2/llama-index/introduction" },
      { title: "Introduction to LlamaHub", path: "unit2/llama-index/llama-hub" },
      { title: "What are Components in LlamaIndex?", path: "unit2/llama-index/components" },
      { title: "Using Tools in LlamaIndex", path: "unit2/llama-index/tools" },
      { title: "Using Agents in LlamaIndex", path: "unit2/llama-index/agents" },
      { title: "Creating Agentic Workflows in LlamaIndex", path: "unit2/llama-index/workflows" },
      { title: "LlamaIndex Conclusion", path: "unit2/llama-index/conclusion" },
    ],
  },
  {
    title: "Unit 2.3: The LangGraph Framework",
    lessons: [
      { title: "Introduction to LangGraph", path: "unit2/langgraph/introduction" },
      { title: "What is LangGraph?", path: "unit2/langgraph/when_to_use_langgraph" },
      { title: "Building Blocks of LangGraph", path: "unit2/langgraph/building_blocks" },
      { title: "Building Your First LangGraph", path: "unit2/langgraph/first_graph" },
      { title: "Document Analysis Graph", path: "unit2/langgraph/document_analysis_agent" },
      { title: "LangGraph Conclusion", path: "unit2/langgraph/conclusion" },
    ],
  },
  {
    title: "Unit 3: Agentic RAG Use Case",
    lessons: [
      { title: "Introduction to Use Case for Agentic RAG", path: "unit3/agentic-rag/introduction" },
      { title: "Agentic Retrieval Augmented Generation (RAG)", path: "unit3/agentic-rag/agentic-rag" },
      { title: "Creating a RAG Tool for Guest Stories", path: "unit3/agentic-rag/invitees" },
      { title: "Building and Integrating Tools for Your Agent", path: "unit3/agentic-rag/tools" },
      { title: "Creating Your Gala Agent", path: "unit3/agentic-rag/agent" },
      { title: "Unit 3 Conclusion", path: "unit3/agentic-rag/conclusion" },
    ],
  },
  {
    title: "Unit 4: Final Project",
    lessons: [
      { title: "Introduction to the Final Unit", path: "unit4/introduction" },
      { title: "What is GAIA?", path: "unit4/what-is-gaia" },
      { title: "The Final Hands-On", path: "unit4/hands-on" },
      { title: "Conclusion of the Course", path: "unit4/conclusion" },
      { title: "What Should You Learn Now?", path: "unit4/additional-readings" },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding Hugging Face Agents Course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "hf-agents-course" },
    update: {},
    create: {
      slug: "hf-agents-course",
      title: "Hugging Face Agents Course",
      subtitle: "Build, evaluate, and deploy AI agents across the leading agent frameworks",
      description: "From core agentic concepts through the smolagents, LlamaIndex, and LangGraph frameworks, an agentic RAG use case, and a final certification project using the GAIA benchmark.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 20,
      pdu_value: 14,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "Build, evaluate, and deploy AI agents across the leading agent frameworks",
        description: "From core agentic concepts through the smolagents, LlamaIndex, and LangGraph frameworks, an agentic RAG use case, and a final certification project using the GAIA benchmark.",
        overview_headline: "What You'll Learn",
        overview_body: "The Hugging Face Agents Course takes you from what an agent is and how LLMs reason, plan, and act, through three major agent frameworks — smolagents, LlamaIndex, and LangGraph — an agentic RAG use case, and a final hands-on project evaluated against the GAIA benchmark.",
        learning_outcomes: [
          "Understand what agents are and how the Thought-Action-Observation cycle works",
          "Build agents with the smolagents framework, including multi-agent and vision agents",
          "Build agents and agentic workflows with LlamaIndex",
          "Build agent graphs with LangGraph",
          "Build an agentic RAG system end-to-end",
          "Evaluate an agent against the GAIA benchmark",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Unit 1: Foundations", description: "What agents are, how LLMs reason, and the Thought-Action-Observation cycle." },
          { title: "Unit 2: Frameworks", description: "smolagents, LlamaIndex, and LangGraph, each with hands-on tutorials." },
          { title: "Unit 3: Agentic RAG", description: "A real use case combining retrieval and agent tool use." },
          { title: "Unit 4: Final Project", description: "Build and evaluate an agent against the GAIA benchmark." },
        ],
        training_exam_prep_headline: "Official Hugging Face Curriculum",
        training_exam_prep_body: "Hugging Face's own official Agents Course, covering the leading open agent frameworks.",
        training_exam_prep_items: ["Official Hugging Face curriculum", "Apache 2.0 licensed", "Covers smolagents, LlamaIndex, and LangGraph"],
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
