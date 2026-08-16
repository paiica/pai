/**
 * One-off importer for "Advanced NLP with spaCy", forked at
 * github.com/hassanchamas/spacy-course. This repo is genuinely different
 * from every other course imported this session: it's the source for an
 * interactive course website (Gatsby), and each chapter is written in a
 * bespoke MDX-like format with custom `<exercise>`, `<codeblock>`,
 * `<slides>`, and `<choice>` tags rather than plain markdown or notebooks
 * — confirmed directly (4 chapters, 12-16 `<exercise>` blocks each, mostly
 * `type="normal"` with a few `type="slides"` and exactly one
 * `type="choice"` across the whole course). Warrants its own one-off
 * parser rather than reuse of the README/notebook pipelines.
 *
 * Mapping:
 * - Each `<exercise type="normal">` becomes a lesson text block (heading +
 *   rendered prose). Its `<codeblock id="X">...</codeblock>` inner text is
 *   a HINT (not the exercise's actual code), folded into an accordion item
 *   — the real starter code lives in a sibling `exc_X.py` file and becomes
 *   a lab cell instead. Solution files (`solution_X.py`) are deliberately
 *   NOT imported, same precedent as excluding solution notebooks
 *   elsewhere: showing the answer key alongside the exercise undermines
 *   the exercise.
 * - `<exercise type="slides">` has no embeddable content (a proprietary
 *   slide-deck player) — becomes a short text block linking out to the
 *   topic on the original course site.
 * - `<exercise type="choice">` becomes both a text block (so the reading
 *   flow doesn't skip it) AND a QuizQuestion on that lesson's chapter quiz.
 * - Lessons are grouped by slide-exercise boundaries within each chapter
 *   (each `type="slides"` exercise introduces a new subtopic in the
 *   source), not one lesson per chapter — this matches the granularity of
 *   every other course built this session instead of just 4 giant lessons.
 *
 * Run with: npx ts-node prisma/import-spacy-course.ts
 * Safe to re-run (idempotent module/lesson upserts, quiz questions are
 * deleteMany+createMany per quiz lesson).
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel, Prisma, QuestionType } from "@prisma/client";
import { marked } from "marked";
import { renderBlockItems, wrapLessonContent } from "../src/modules/content-import/rise-html-blocks";
import { stripMarkdownInline, type Block, type LabCell } from "./course-import-lib";

const prisma = new PrismaClient();
const REPO_RAW = "https://raw.githubusercontent.com/hassanchamas/spacy-course/master";
const COURSE_SITE = "https://course.spacy.io";

type ExerciseType = "normal" | "slides" | "choice";
interface ParsedExercise {
  num: number;
  title: string;
  type: ExerciseType;
  bodyMd: string;
  codeblockIds: string[];
  choice?: { options: { text: string; correct: boolean; explanation: string }[] };
}

function parseChapter(md: string): { chapterTitle: string; exercises: ParsedExercise[] } {
  const titleMatch = md.match(/^title:\s*'([^']+)'/m) ?? md.match(/^title:\s*"([^"]+)"/m);
  const chapterTitle = titleMatch ? titleMatch[1] : "Chapter";

  const exerciseRe = /<exercise id="(\d+)" title="([^"]*)"(?:\s+type="(\w+)")?\s*>([\s\S]*?)<\/exercise>/g;
  const exercises: ParsedExercise[] = [];
  for (const m of md.matchAll(exerciseRe)) {
    const num = Number(m[1]);
    const title = m[2];
    const type = (m[3] as ExerciseType) || "normal";
    let body = m[4];

    const codeblockIds: string[] = [];
    body = body.replace(/<codeblock id="([^"]+)">([\s\S]*?)<\/codeblock>|<codeblock id="([^"]+)"\s*\/?>/g, (_full, id1, _hint, id2) => {
      codeblockIds.push(id1 || id2);
      return "";
    });

    let choice: ParsedExercise["choice"];
    if (type === "choice") {
      const options: { text: string; correct: boolean; explanation: string }[] = [];
      const choiceBlock = body.match(/<choice>([\s\S]*?)<\/choice>/);
      body = body.replace(/<choice>[\s\S]*?<\/choice>/, "");
      if (choiceBlock) {
        const optRe = /<opt(\s+correct="true")?\s+text="([^"]*)">([\s\S]*?)<\/opt>/g;
        for (const om of choiceBlock[1].matchAll(optRe)) {
          options.push({ correct: !!om[1], text: om[2], explanation: om[3].trim() });
        }
      }
      choice = { options };
    }

    body = body.replace(/<slides[^>]*>[\s\S]*?<\/slides>/g, "").trim();
    exercises.push({ num, title, type, bodyMd: body, codeblockIds, choice });
  }
  return { chapterTitle, exercises };
}

// Groups exercises into lessons at each `slides` exercise boundary.
function groupIntoLessons(exercises: ParsedExercise[]): { title: string; exercises: ParsedExercise[] }[] {
  const groups: { title: string; exercises: ParsedExercise[] }[] = [];
  let current: ParsedExercise[] = [];
  for (const ex of exercises) {
    if (ex.type === "slides" && current.length) {
      groups.push({ title: current[0].title, exercises: current });
      current = [];
    }
    current.push(ex);
  }
  if (current.length) groups.push({ title: current[0].title, exercises: current });
  return groups;
}

function buildBlocksForLesson(chapterTitle: string, group: { title: string; exercises: ParsedExercise[] }): { blocks: Block[]; quizQuestions: { question: string; options: string[]; correctIndex: number }[] } {
  const blocks: Block[] = [];
  const quizQuestions: { question: string; options: string[]; correctIndex: number }[] = [];
  const accordionItems: { title: string; description: string }[] = [];

  for (const ex of group.exercises) {
    if (ex.type === "slides") {
      blocks.push({ type: "text", items: [{ heading: ex.title, paragraph: `<p>Video walkthrough available on the original course site: <a href="${COURSE_SITE}" target="_blank" rel="noopener noreferrer">course.spacy.io</a> — search for "${chapterTitle}: ${ex.title}".</p>` }] });
      continue;
    }
    const html = marked.parse(ex.bodyMd) as string;
    if (ex.type === "choice" && ex.choice) {
      const optsHtml = ex.choice.options.map((o) => `<li>${o.correct ? "<strong>" : ""}${stripMarkdownInline(o.text)}${o.correct ? " (correct)</strong>" : ""}</li>`).join("");
      blocks.push({ type: "text", items: [{ heading: ex.title, paragraph: `${html}<ul>${optsHtml}</ul>` }] });
      const correctIndex = ex.choice.options.findIndex((o) => o.correct);
      quizQuestions.push({ question: stripMarkdownInline(ex.bodyMd.split("\n")[0] || ex.title), options: ex.choice.options.map((o) => stripMarkdownInline(o.text)), correctIndex: Math.max(0, correctIndex) });
      continue;
    }
    if (html.trim()) blocks.push({ type: "text", items: [{ heading: ex.title, paragraph: html }] });
  }

  if (accordionItems.length) blocks.push({ type: "interactive", family: "interactive", variant: "accordion", items: accordionItems });
  return { blocks, quizQuestions };
}

async function fetchExerciseCode(id: string): Promise<string | null> {
  const res = await fetch(`${REPO_RAW}/exercises/en/exc_${id}.py`);
  return res.ok ? res.text() : null;
}

async function main() {
  console.log("🌱  Importing Advanced NLP with spaCy…\n");
  const course = await prisma.course.upsert({
    where: { slug: "advanced-nlp-with-spacy" },
    update: {},
    create: {
      slug: "advanced-nlp-with-spacy",
      title: "Advanced NLP with spaCy",
      subtitle: "A hands-on, exercise-driven course in industrial-strength NLP",
      description: "From finding words, phrases, and entities through large-scale data analysis, custom processing pipelines, and training your own neural network model with spaCy.",
      price: 199.0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 12,
      pdu_value: 8,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "A hands-on, exercise-driven course in industrial-strength NLP",
        description: "From finding words, phrases, and entities through large-scale data analysis, custom processing pipelines, and training your own neural network model with spaCy.",
        overview_headline: "What You'll Learn",
        overview_body: "Advanced NLP with spaCy takes you from core NLP data structures and rule-based matching through large-scale data analysis, word vectors, custom processing pipeline components, and training your own spaCy model.",
        learning_outcomes: [
          "Work with spaCy's core data structures: Doc, Span, Token, and Vocab",
          "Use rule-based matching alongside statistical predictions",
          "Analyze large volumes of text efficiently",
          "Build custom spaCy pipeline components and extension attributes",
          "Train and evaluate your own spaCy model",
        ],
        how_it_works_headline: "How the Course Is Structured",
        how_it_works_steps: [
          { title: "Chapter 1", description: "Finding words, phrases, names, and concepts." },
          { title: "Chapter 2", description: "Large-scale data analysis with spaCy." },
          { title: "Chapter 3", description: "Building custom processing pipelines." },
          { title: "Chapter 4", description: "Training your own neural network model." },
        ],
        training_exam_prep_headline: "Hands-On Throughout",
        training_exam_prep_body: "Every lesson pairs its exercises with a runnable lab containing the real starter code.",
        training_exam_prep_items: ["Linked hands-on code labs", "Real spaCy code throughout", "Official Explosion AI curriculum"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  let moduleSortOrder = 1, totalLessons = 0;
  for (let ch = 1; ch <= 4; ch++) {
    const res = await fetch(`${REPO_RAW}/chapters/en/chapter${ch}.md`);
    const md = await res.text();
    const { chapterTitle, exercises } = parseChapter(md);
    const lessonGroups = groupIntoLessons(exercises);

    let mod = await prisma.module.findFirst({ where: { course_id: course.id, title: chapterTitle } });
    if (!mod) mod = await prisma.module.create({ data: { course_id: course.id, title: chapterTitle, description: "", sort_order: moduleSortOrder, is_published: true } });
    moduleSortOrder++;
    console.log(`\n✓ Module: ${chapterTitle}`);

    let lessonSortOrder = 1;
    for (const group of lessonGroups) {
      const { blocks, quizQuestions } = buildBlocksForLesson(chapterTitle, group);
      const flags: string[] = [];
      const { html } = await renderBlockItems(blocks, new Map(), async () => "", flags);

      let lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: group.title } });
      if (!lesson) {
        lesson = await prisma.lesson.create({
          data: { module_id: mod.id, title: group.title, type: "reading", sort_order: lessonSortOrder, duration_minutes: 30, is_published: true, is_free_preview: ch === 1 && lessonSortOrder === 1 },
        });
      }
      await prisma.lesson.update({ where: { id: lesson.id }, data: { blocks_json: blocks as unknown as Prisma.InputJsonValue, content_body: wrapLessonContent(html) } });
      lessonSortOrder++;
      totalLessons++;

      const codeIds = group.exercises.flatMap((e) => e.codeblockIds);
      const cells: LabCell[] = [];
      for (const id of codeIds) {
        const code = await fetchExerciseCode(id);
        if (code && code.trim()) cells.push({ type: "code", content: code, runnable: true });
      }
      if (cells.length) {
        await prisma.lesson.update({ where: { id: lesson.id }, data: { lab_cells_json: cells as unknown as Prisma.InputJsonValue } });
      }
      console.log(`  ✓ ${group.title}  (${blocks.length} blocks, ${cells.length} lab cells${quizQuestions.length ? `, ${quizQuestions.length} quiz question(s)` : ""})`);

      if (quizQuestions.length) {
        const quizTitle = `${group.title} — Knowledge Check`;
        let quizLesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: quizTitle } });
        if (!quizLesson) {
          await prisma.lesson.updateMany({ where: { module_id: mod.id, sort_order: { gt: lesson.sort_order } }, data: { sort_order: { increment: 1 } } });
          quizLesson = await prisma.lesson.create({ data: { module_id: mod.id, title: quizTitle, type: "quiz", sort_order: lesson.sort_order + 1, duration_minutes: 5, is_published: true, max_attempts: 3 } });
          lessonSortOrder++;
          totalLessons++;
        }
        await prisma.quizQuestion.deleteMany({ where: { lesson_id: quizLesson.id } });
        await prisma.quizQuestion.createMany({
          data: quizQuestions.map((q, qi) => ({
            lesson_id: quizLesson!.id, question_text: q.question, question_type: QuestionType.multiple_choice,
            options: q.options, correct_index: q.correctIndex, points: 1, sort_order: qi + 1,
          })),
        });
        console.log(`    ✓ Quiz: ${quizTitle} (${quizQuestions.length} question(s))`);
      }
    }
  }

  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Imported spaCy course: ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
