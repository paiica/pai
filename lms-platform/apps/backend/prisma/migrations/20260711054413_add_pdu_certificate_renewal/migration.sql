-- AlterEnum
ALTER TYPE "lms"."CertificateStatus" ADD VALUE 'lapsed';

-- AlterTable
ALTER TABLE "lms"."certificates" ADD COLUMN     "last_renewal_reminder_days_out" INTEGER,
ADD COLUMN     "renewal_amount_paid" DECIMAL(10,2),
ADD COLUMN     "renewal_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "renewal_stripe_payment_intent_id" TEXT,
ADD COLUMN     "renewed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lms"."certifications" ADD COLUMN     "renewal_fee" DECIMAL(10,2) NOT NULL DEFAULT 99.00,
ADD COLUMN     "renewal_grace_period_days" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN     "renewal_pdu_required" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "renewal_window_days" INTEGER NOT NULL DEFAULT 90;

-- AlterTable
ALTER TABLE "lms"."courses" ADD COLUMN     "pdu_value" DECIMAL(5,1) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "lms"."lesson_progress" ADD COLUMN     "course_enrollment_id" TEXT,
ALTER COLUMN "enrollment_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "lesson_progress_course_enrollment_id_idx" ON "lms"."lesson_progress"("course_enrollment_id");

-- AddForeignKey
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_course_enrollment_id_fkey" FOREIGN KEY ("course_enrollment_id") REFERENCES "lms"."course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
