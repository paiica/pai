-- AlterTable
ALTER TABLE "lms"."certifications" ADD COLUMN     "eligible_job_titles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "required_education" TEXT[] DEFAULT ARRAY[]::TEXT[];
