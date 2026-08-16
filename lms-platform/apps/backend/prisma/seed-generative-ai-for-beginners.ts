/**
 * Seeds "Generative AI for Beginners" — Microsoft's curriculum (22 lessons),
 * forked at github.com/hassanchamas/generative-ai-for-beginners.
 *
 * Structurally different from ML/Data-Science-For-Beginners: lessons are
 * flat top-level numbered folders (not grouped into weekly section
 * directories), so modules here are a thematic grouping authored for this
 * import rather than mirroring the repo's own folder structure. No
 * quiz-app and no assignment.md in this repo — confirmed directly, not
 * assumed — so this course has no quiz-import or assignment-sibling step.
 * Notebooks live under a per-provider `python/` subfolder (e.g.
 * `oai-assignment.ipynb`), not a single canonical `notebook.ipynb`.
 *
 * Run with: npx ts-node prisma/seed-generative-ai-for-beginners.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";
import { makeRepoHelpers, resolveLessonTitle } from "./course-import-lib";

const prisma = new PrismaClient();
const { fetchText } = makeRepoHelpers("hassanchamas", "generative-ai-for-beginners");

export const MODULES = [
  { title: "Getting Started", folders: ["00-course-setup", "01-introduction-to-genai", "02-exploring-and-comparing-different-llms", "03-using-generative-ai-responsibly"] },
  { title: "Prompt Engineering", folders: ["04-prompt-engineering-fundamentals", "05-advanced-prompts"] },
  { title: "Building Applications", folders: ["06-text-generation-apps", "07-building-chat-applications", "08-building-search-applications", "09-building-image-applications", "10-building-low-code-ai-applications", "11-integrating-with-function-calling", "12-designing-ux-for-ai-applications", "13-securing-ai-applications"] },
  { title: "Production & Lifecycle", folders: ["14-the-generative-ai-application-lifecycle", "15-rag-and-vector-databases", "16-open-source-models"] },
  { title: "Advanced Topics", folders: ["17-ai-agents", "18-fine-tuning", "19-slm", "20-mistral", "21-meta"] },
];

async function resolveTitle(folder: string): Promise<string> {
  const md = await fetchText(`${folder}/README.md`);
  return resolveLessonTitle(md, folder);
}

async function main() {
  console.log("🌱  Seeding Generative AI for Beginners course…\n");
  const course = await prisma.course.upsert({
    where: { slug: "generative-ai-for-beginners" },
    update: {},
    create: {
      slug: "generative-ai-for-beginners",
      title: "Generative AI for Beginners",
      subtitle: "A hands-on introduction to building generative AI applications",
      description: "From LLM fundamentals and prompt engineering through building chat, search, and image applications, RAG, AI agents, and fine-tuning — a practical foundation for building real generative AI applications.",
      price: 249.0,
      status: CourseStatus.draft,
      level: CourseLevel.beginner,
      duration_hours: 25,
      pdu_value: 18,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A hands-on introduction to building generative AI applications",
        description: "From LLM fundamentals and prompt engineering through building chat, search, and image applications, RAG, AI agents, and fine-tuning — a practical foundation for building real generative AI applications.",
        overview_headline: "What You'll Learn",
        overview_body: "Generative AI for Beginners takes you from understanding and comparing LLMs through prompt engineering, building real chat/search/image applications, securing and designing UX for AI apps, RAG and vector databases, open-source models, AI agents, and fine-tuning.",
        learning_outcomes: [
          "Explain how generative AI and large language models work, and use them responsibly",
          "Apply prompt engineering fundamentals and advanced prompting techniques",
          "Build chat, search, and image generation applications",
          "Integrate function calling and design good UX for AI applications",
          "Apply RAG and vector databases to ground LLM responses in real data",
          "Build AI agents and fine-tune models for specific tasks",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Step 1: Getting Started", description: "Understand what generative AI is, compare LLMs, and use AI responsibly." },
          { title: "Step 2: Prompt Engineering", description: "Master prompt engineering fundamentals and advanced techniques." },
          { title: "Step 3: Building Applications", description: "Build real chat, search, image, and low-code AI applications." },
          { title: "Step 4: Production & Advanced Topics", description: "RAG, vector databases, AI agents, and fine-tuning models." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Lessons with a companion notebook link to a runnable lab so you practice each concept in code.",
        training_exam_prep_items: ["Linked hands-on notebook labs", "Real prompt engineering examples", "Python code samples"],
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
          duration_minutes: 25, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
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
