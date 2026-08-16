/**
 * Imports quizzes for ML for Beginners. Unlike AI Foundations (quizzes
 * hand-authored per module), this repo's 52 quizzes live centrally in
 * `quiz-app/src/assets/translations/en.json` — 2 quizzes (Pre-Lecture +
 * Post-Lecture) per lesson, matched here to lessons by an explicit
 * title-verified mapping (confirmed directly against the real quiz list,
 * not guessed — the 27th lesson, a "Postscript" bonus lesson, has no
 * matching quiz, consistent with the repo's own "26 lessons, 52 quizzes"
 * count vs the 27 actual content folders).
 *
 * Both quizzes per lesson are combined into ONE "Knowledge Check" quiz
 * lesson (matching AI Foundations' one-quiz-per-topic granularity) rather
 * than two separate pre/post siblings, inserted right after the lesson
 * (and its assignment sibling, if enrich-ml-for-beginners.ts already ran).
 *
 * Source format quirk: `answerOptions[].isCorrect` is the STRING "true"/
 * "false", not a boolean — converted to `correct_index` here.
 *
 * Run with: npx ts-node prisma/import-quizzes-ml-for-beginners.ts
 * Idempotent — updates the quiz lesson + replaces its questions if it
 * already exists, rather than creating a duplicate.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, QuestionType } from "@prisma/client";

const prisma = new PrismaClient();
const QUIZ_JSON_URL = "https://raw.githubusercontent.com/hassanchamas/ML-For-Beginners/main/quiz-app/src/assets/translations/en.json";

// [moduleTitle, lessonTitle, preQuizId, postQuizId] — verified directly
// against the real en.json quiz list (52 entries), not guessed.
const LESSON_QUIZ_MAP: [string, string, number, number][] = [
  ["Week 1: Introduction to Machine Learning", "Introduction to machine learning", 1, 2],
  ["Week 1: Introduction to Machine Learning", "History of machine learning", 3, 4],
  ["Week 1: Introduction to Machine Learning", "Building Machine Learning solutions with responsible AI", 5, 6],
  ["Week 1: Introduction to Machine Learning", "Techniques of Machine Learning", 7, 8],
  ["Week 2: Regression", "Get started with Python and Scikit-learn for regression models", 9, 10],
  ["Week 2: Regression", "Build a regression model using Scikit-learn: prepare and visualize data", 11, 12],
  ["Week 2: Regression", "Build a regression model using Scikit-learn: regression four ways", 13, 14],
  ["Week 2: Regression", "Logistic regression to predict categories", 15, 16],
  ["Week 3: Build a Web App", "Build a Web App to use a ML Model", 17, 18],
  ["Week 4: Classification", "Introduction to classification", 19, 20],
  ["Week 4: Classification", "Cuisine classifiers 1", 21, 22],
  ["Week 4: Classification", "Cuisine classifiers 2", 23, 24],
  ["Week 4: Classification", "Build a Cuisine Recommender Web App", 25, 26],
  ["Week 5: Clustering", "Introduction to clustering", 27, 28],
  ["Week 5: Clustering", "K-Means clustering", 29, 30],
  ["Week 6: Natural Language Processing", "Introduction to natural language processing", 31, 32],
  ["Week 6: Natural Language Processing", "Common natural language processing tasks and techniques", 33, 34],
  ["Week 6: Natural Language Processing", "Translation and sentiment analysis with ML", 35, 36],
  ["Week 6: Natural Language Processing", "Sentiment analysis with hotel reviews - processing the data", 37, 38],
  ["Week 6: Natural Language Processing", "Sentiment analysis with hotel reviews", 39, 40],
  ["Week 7: Time Series Forecasting", "Introduction to time series forecasting", 41, 42],
  ["Week 7: Time Series Forecasting", "Time series forecasting with ARIMA", 43, 44],
  ["Week 7: Time Series Forecasting", "Time Series Forecasting with Support Vector Regressor", 51, 52],
  ["Week 8: Reinforcement Learning", "Introduction to Reinforcement Learning and Q-Learning", 45, 46],
  ["Week 8: Reinforcement Learning", "CartPole Skating", 47, 48],
  ["Week 9: Real-World ML", "Postscript: Machine learning in the real world", 49, 50],
  // "Postscript: Model Debugging..." intentionally has no quiz in the source.
];

async function main() {
  console.log("🌱  Importing quizzes for ML for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "ml-for-beginners" } });
  if (!course) throw new Error("Run seed-ml-for-beginners.ts first");

  const res = await fetch(QUIZ_JSON_URL);
  if (!res.ok) throw new Error(`Failed to fetch quiz JSON: ${res.status}`);
  const raw = await res.json();
  // The source file's top level is a single-element array wrapping the real
  // { title, quizzes: [...] } object — not the object directly.
  const data = Array.isArray(raw) ? raw[0] : raw;
  const quizzesById = new Map<number, any>(data.quizzes.map((q: any) => [q.id, q]));

  let created = 0, questionsTotal = 0;
  for (const [moduleTitle, lessonTitle, preId, postId] of LESSON_QUIZ_MAP) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: moduleTitle } });
    if (!mod) { console.warn(`⚠ Module not found: ${moduleTitle}`); continue; }
    const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
    if (!lesson) { console.warn(`⚠ Lesson not found: ${moduleTitle} / ${lessonTitle}`); continue; }

    const pre = quizzesById.get(preId);
    const post = quizzesById.get(postId);
    if (!pre || !post) { console.warn(`⚠ Quiz id(s) not found: ${preId}/${postId} for ${lessonTitle}`); continue; }

    const questions = [
      ...(pre.quiz ?? []).map((q: any) => ({ ...q, _phase: "Pre-Lecture" })),
      ...(post.quiz ?? []).map((q: any) => ({ ...q, _phase: "Post-Lecture" })),
    ];

    const quizTitle = `${lessonTitle} — Knowledge Check`;
    let quizLesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: quizTitle } });
    if (!quizLesson) {
      await prisma.lesson.updateMany({
        where: { module_id: mod.id, sort_order: { gt: lesson.sort_order } },
        data: { sort_order: { increment: 1 } },
      });
      quizLesson = await prisma.lesson.create({
        data: {
          module_id: mod.id,
          title: quizTitle,
          type: "quiz",
          sort_order: lesson.sort_order + 1,
          duration_minutes: 10,
          is_published: true,
          max_attempts: 3,
        },
      });
    }

    await prisma.quizQuestion.deleteMany({ where: { lesson_id: quizLesson.id } });
    await prisma.quizQuestion.createMany({
      data: questions.map((q: any, i: number) => {
        const options: string[] = (q.answerOptions ?? []).map((o: any) => o.answerText);
        const correctIndex = (q.answerOptions ?? []).findIndex((o: any) => String(o.isCorrect) === "true");
        const isTrueFalse = options.length === 2 && options.map((o) => o.toLowerCase()).includes("true");
        return {
          lesson_id: quizLesson!.id,
          question_text: `[${q._phase}] ${q.questionText}`,
          question_type: isTrueFalse ? QuestionType.true_false : QuestionType.multiple_choice,
          options,
          correct_index: Math.max(0, correctIndex),
          points: 1,
          sort_order: i + 1,
        };
      }),
    });

    console.log(`✓ ${lessonTitle} — Knowledge Check  (${questions.length} questions)`);
    created++;
    questionsTotal += questions.length;
  }

  console.log(`\n✅  Created/updated ${created} quiz lesson(s), ${questionsTotal} total questions.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
