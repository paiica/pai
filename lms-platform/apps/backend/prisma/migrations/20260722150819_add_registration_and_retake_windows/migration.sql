-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "lms"."EnrollmentStatus" ADD VALUE 'registration_expired';
ALTER TYPE "lms"."EnrollmentStatus" ADD VALUE 'retake_expired';

-- AlterTable
ALTER TABLE "lms"."certifications" ADD COLUMN     "registration_validity_days" INTEGER NOT NULL DEFAULT 365,
ADD COLUMN     "retake_window_days" INTEGER NOT NULL DEFAULT 60;
