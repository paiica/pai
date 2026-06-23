/*
  Warnings:

  - Added the required column `updated_at` to the `quiz_questions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "lms"."QuestionType" AS ENUM ('multiple_choice', 'true_false', 'short_answer');

-- CreateEnum
CREATE TYPE "lms"."SubmissionStatus" AS ENUM ('submitted', 'under_review', 'graded', 'returned');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "lms"."NotificationType" ADD VALUE 'assignment_submitted';
ALTER TYPE "lms"."NotificationType" ADD VALUE 'assignment_graded';

-- AlterTable
ALTER TABLE "lms"."lessons" ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "max_attempts" INTEGER DEFAULT 3,
ADD COLUMN     "max_score" INTEGER DEFAULT 100,
ADD COLUMN     "time_limit_minutes" INTEGER;

-- AlterTable
ALTER TABLE "lms"."quiz_questions" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "question_type" "lms"."QuestionType" NOT NULL DEFAULT 'multiple_choice',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "lms"."uploaded_files" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "lesson_id" TEXT,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'content',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."assignment_submissions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "text_content" TEXT,
    "status" "lms"."SubmissionStatus" NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "grade" DOUBLE PRECISION,
    "max_grade" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "feedback" TEXT,
    "graded_by" TEXT,
    "graded_at" TIMESTAMP(3),

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uploaded_files_owner_id_idx" ON "lms"."uploaded_files"("owner_id");

-- CreateIndex
CREATE INDEX "uploaded_files_lesson_id_idx" ON "lms"."uploaded_files"("lesson_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_enrollment_id_idx" ON "lms"."assignment_submissions"("enrollment_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_lesson_id_idx" ON "lms"."assignment_submissions"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_lesson_id_user_id_key" ON "lms"."assignment_submissions"("lesson_id", "user_id");

-- CreateIndex
CREATE INDEX "quiz_questions_lesson_id_idx" ON "lms"."quiz_questions"("lesson_id");

-- AddForeignKey
ALTER TABLE "lms"."uploaded_files" ADD CONSTRAINT "uploaded_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."uploaded_files" ADD CONSTRAINT "uploaded_files_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "lms"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
