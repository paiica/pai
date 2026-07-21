-- AlterTable
ALTER TABLE "lms"."certifications" ADD COLUMN     "ai_professor_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "lms"."courses" ADD COLUMN     "ai_professor_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "lms"."lesson_notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_notes_user_id_lesson_id_key" ON "lms"."lesson_notes"("user_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "lms"."lesson_notes" ADD CONSTRAINT "lesson_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_notes" ADD CONSTRAINT "lesson_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
