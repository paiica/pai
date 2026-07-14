-- CreateEnum
CREATE TYPE "lms"."CoursePrerequisiteType" AS ENUM ('prerequisite', 'corequisite');

-- AlterTable
ALTER TABLE "lms"."course_cert_recommendations" ADD COLUMN     "is_required" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "lms"."course_prerequisites" (
    "course_id" TEXT NOT NULL,
    "prerequisite_course_id" TEXT NOT NULL,
    "type" "lms"."CoursePrerequisiteType" NOT NULL DEFAULT 'prerequisite',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_prerequisites_pkey" PRIMARY KEY ("course_id","prerequisite_course_id")
);

-- AddForeignKey
ALTER TABLE "lms"."course_prerequisites" ADD CONSTRAINT "course_prerequisites_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_prerequisites" ADD CONSTRAINT "course_prerequisites_prerequisite_course_id_fkey" FOREIGN KEY ("prerequisite_course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
