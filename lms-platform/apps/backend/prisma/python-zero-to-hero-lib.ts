/**
 * Shared helpers for populating Python for Beginners: From Zero to
 * Hero's content. Unlike every other course this session, this content
 * is originally authored, not scraped — so there's no fetch/resolve
 * step, just markdown -> blocks -> save, reusing the same
 * buildLessonBlocksFromReadme/renderAndSaveLessonBlocks pipeline (and
 * therefore the same flashcard/accordion/video handling) as every
 * other course.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, flagLabCell } from "./course-import-lib";

const identity = (html: string) => html;

export async function findLesson(prisma: PrismaClient, courseSlug: string, moduleTitle: string, lessonTitle: string) {
  const course = await prisma.course.findUniqueOrThrow({ where: { slug: courseSlug } });
  const mod = await prisma.module.findFirstOrThrow({ where: { course_id: course.id, title: { startsWith: moduleTitle } } });
  const lesson = await prisma.lesson.findFirstOrThrow({ where: { module_id: mod.id, title: lessonTitle, parent_lesson_id: null } });
  return lesson;
}

export async function findSublesson(prisma: PrismaClient, courseSlug: string, moduleTitle: string, parentLessonTitle: string, sublessonTitle: string) {
  const parent = await findLesson(prisma, courseSlug, moduleTitle, parentLessonTitle);
  const sub = await prisma.lesson.findFirstOrThrow({ where: { parent_lesson_id: parent.id, title: sublessonTitle } });
  return sub;
}

export async function writeLessonContent(prisma: PrismaClient, lessonId: string, markdown: string): Promise<{ blocks: number }> {
  const blocks = buildLessonBlocksFromReadme(markdown, "", identity);
  await renderAndSaveLessonBlocks(prisma, lessonId, blocks);
  return { blocks: blocks.length };
}

// Attaches a runnable Python lab. `code` is the starter code shown in the
// editor; `instructions` is a markdown cell rendered above it in the lab
// panel (matches the LabCell shape used by every notebook-based course
// this session: { type: "markdown" | "code", content, runnable? }).
export async function attachLab(
  prisma: PrismaClient,
  lessonId: string,
  cells: { instructions?: string; code: string }[],
): Promise<void> {
  const labCells: any[] = [];
  for (const cell of cells) {
    if (cell.instructions) labCells.push({ type: "markdown", content: cell.instructions });
    labCells.push({ type: "code", content: cell.code, ...flagLabCell(cell.code) });
  }
  await prisma.lesson.update({ where: { id: lessonId }, data: { lab_cells_json: labCells as unknown as Prisma.InputJsonValue } });
}

export interface QuizQuestionDef {
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  points?: number;
}

export async function writeQuiz(prisma: PrismaClient, lessonId: string, questions: QuizQuestionDef[]): Promise<void> {
  await prisma.quizQuestion.deleteMany({ where: { lesson_id: lessonId } });
  let sort_order = 0;
  for (const q of questions) {
    await prisma.quizQuestion.create({
      data: {
        lesson_id: lessonId,
        question_text: q.question_text,
        question_type: "multiple_choice",
        options: q.options as unknown as Prisma.InputJsonValue,
        correct_index: q.correct_index,
        explanation: q.explanation,
        points: q.points ?? 1,
        sort_order: sort_order++,
      },
    });
  }
}
