/**
 * Imports quizzes for Data Science for Beginners. Quiz data is split across
 * 6 group JSON files (quiz-app/src/assets/translations/en/group-{1..6}.json)
 * but IDs are globally sequential (0-39) and map 1:1, in lesson-folder
 * order, to 2 quizzes (Pre + Post) per lesson — verified directly against
 * the real files, not guessed.
 *
 * Run with: npx ts-node prisma/import-quizzes-data-science-for-beginners.ts
 * Idempotent.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, QuestionType } from "@prisma/client";
import { MODULES } from "./seed-data-science-for-beginners";

const prisma = new PrismaClient();
const GROUPS = 6;

async function main() {
  console.log("🌱  Importing quizzes for Data Science for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "data-science-for-beginners" } });
  if (!course) throw new Error("Run seed-data-science-for-beginners.ts first");

  const quizzesById = new Map<number, any>();
  for (let g = 1; g <= GROUPS; g++) {
    const res = await fetch(`https://raw.githubusercontent.com/hassanchamas/Data-Science-For-Beginners/main/quiz-app/src/assets/translations/en/group-${g}.json`);
    if (!res.ok) { console.warn(`⚠ group-${g}.json not found`); continue; }
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw[0] : raw;
    for (const q of data.quizzes ?? []) quizzesById.set(q.id, q);
  }
  console.log(`Fetched ${quizzesById.size} quizzes across ${GROUPS} groups.\n`);

  // Flatten lesson list in folder order, matching the quizzes' 0-based
  // sequential id assignment (lesson i -> quiz ids 2i, 2i+1).
  const lessonList: { moduleTitle: string; folder: string; sectionPath: string }[] = [];
  for (const mod of MODULES) for (const folder of mod.folders) lessonList.push({ moduleTitle: mod.title, folder, sectionPath: mod.sectionPath });

  let created = 0, questionsTotal = 0;
  for (let i = 0; i < lessonList.length; i++) {
    const { moduleTitle, sectionPath, folder } = lessonList[i];
    const preId = i * 2, postId = i * 2 + 1;
    const pre = quizzesById.get(preId), post = quizzesById.get(postId);
    if (!pre || !post) { console.warn(`⚠ Quiz ids ${preId}/${postId} not found for lesson index ${i}`); continue; }

    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: moduleTitle } });
    if (!mod) continue;
    const readme = await fetch(`https://raw.githubusercontent.com/hassanchamas/Data-Science-For-Beginners/main/${sectionPath}/${folder}/README.md`).then((r) => r.ok ? r.text() : null);
    const titleMatch = readme?.match(/^#\s+(.+)$/m);
    const lessonTitle = titleMatch ? titleMatch[1].replace(/[`*_]/g, "").trim() : folder;
    const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
    if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonTitle}`); continue; }

    const questions = [
      ...(pre.quiz ?? []).map((q: any) => ({ ...q, _phase: "Pre-Lecture" })),
      ...(post.quiz ?? []).map((q: any) => ({ ...q, _phase: "Post-Lecture" })),
    ];
    const quizTitle = `${lessonTitle} — Knowledge Check`;
    let quizLesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: quizTitle } });
    if (!quizLesson) {
      await prisma.lesson.updateMany({ where: { module_id: mod.id, sort_order: { gt: lesson.sort_order } }, data: { sort_order: { increment: 1 } } });
      quizLesson = await prisma.lesson.create({
        data: { module_id: mod.id, title: quizTitle, type: "quiz", sort_order: lesson.sort_order + 1, duration_minutes: 10, is_published: true, max_attempts: 3 },
      });
    }
    await prisma.quizQuestion.deleteMany({ where: { lesson_id: quizLesson.id } });
    await prisma.quizQuestion.createMany({
      data: questions.map((q: any, qi: number) => {
        const options: string[] = (q.answerOptions ?? []).map((o: any) => o.answerText);
        const correctIndex = Math.max(0, (q.answerOptions ?? []).findIndex((o: any) => String(o.isCorrect) === "true"));
        const isTrueFalse = options.length === 2 && options.map((o) => o.toLowerCase()).includes("true");
        return {
          lesson_id: quizLesson!.id,
          question_text: `[${q._phase}] ${q.questionText}`,
          question_type: isTrueFalse ? QuestionType.true_false : QuestionType.multiple_choice,
          options, correct_index: correctIndex, points: 1, sort_order: qi + 1,
        };
      }),
    });
    console.log(`✓ ${lessonTitle} — Knowledge Check  (${questions.length} questions)`);
    created++;
    questionsTotal += questions.length;
  }
  console.log(`\n✅  Created/updated ${created} quiz lesson(s), ${questionsTotal} total questions.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
