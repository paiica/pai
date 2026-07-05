-- AlterTable
ALTER TABLE "lms"."event_registrations" ADD COLUMN     "address" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "job_title" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "years_experience" INTEGER;
