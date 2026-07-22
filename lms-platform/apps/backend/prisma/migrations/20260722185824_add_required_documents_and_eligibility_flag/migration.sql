-- AlterTable
ALTER TABLE "lms"."applications" ADD COLUMN     "eligibility_flag_reason" TEXT,
ADD COLUMN     "eligibility_flagged" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "lms"."certifications" ADD COLUMN     "required_documents" TEXT[] DEFAULT ARRAY[]::TEXT[];
