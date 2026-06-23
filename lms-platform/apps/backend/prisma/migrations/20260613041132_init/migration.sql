-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "lms";

-- CreateEnum
CREATE TYPE "lms"."Role" AS ENUM ('super_admin', 'admin', 'professor', 'student');

-- CreateEnum
CREATE TYPE "lms"."ApplicationStatus" AS ENUM ('pending_payment', 'pending_review', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "lms"."EnrollmentStatus" AS ENUM ('active', 'completed', 'suspended', 'expired');

-- CreateEnum
CREATE TYPE "lms"."LessonType" AS ENUM ('video', 'reading', 'quiz', 'assignment', 'live_session', 'download');

-- CreateEnum
CREATE TYPE "lms"."ExamAttemptStatus" AS ENUM ('in_progress', 'passed', 'failed', 'abandoned');

-- CreateEnum
CREATE TYPE "lms"."CertificateStatus" AS ENUM ('active', 'expired', 'revoked', 'suspended');

-- CreateEnum
CREATE TYPE "lms"."PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "lms"."PaymentType" AS ENUM ('enrollment', 'retake_fee', 'renewal_fee', 'corporate_bundle');

-- CreateEnum
CREATE TYPE "lms"."NotificationType" AS ENUM ('application_submitted', 'application_approved', 'application_rejected', 'enrollment_created', 'lesson_completed', 'module_completed', 'course_completed', 'exam_passed', 'exam_failed', 'certificate_issued', 'certificate_expiring', 'payment_succeeded', 'payment_failed', 'system_announcement');

-- CreateEnum
CREATE TYPE "lms"."CareerStatus" AS ENUM ('professional', 'student', 'other');

-- CreateEnum
CREATE TYPE "lms"."CertificationLevel" AS ENUM ('foundation', 'advanced', 'executive', 'specialist');

-- CreateEnum
CREATE TYPE "lms"."CertificationStatus" AS ENUM ('active', 'archived', 'coming_soon');

-- CreateTable
CREATE TABLE "lms"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "lms"."Role" NOT NULL DEFAULT 'student',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "language" TEXT NOT NULL DEFAULT 'en',
    "career_status" "lms"."CareerStatus",
    "job_title" TEXT,
    "company" TEXT,
    "industry" TEXT,
    "years_experience" INTEGER,
    "linkedin_url" TEXT,
    "university" TEXT,
    "degree_program" TEXT,
    "graduation_year" INTEGER,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "marketing_emails" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."certifications" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "lms"."CertificationLevel" NOT NULL,
    "status" "lms"."CertificationStatus" NOT NULL DEFAULT 'active',
    "badge_icon" TEXT NOT NULL DEFAULT '🎓',
    "badge_image_url" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "stripe_price_id" TEXT,
    "description" TEXT NOT NULL,
    "long_description" TEXT NOT NULL,
    "learning_outcomes" TEXT[],
    "target_audience" TEXT[],
    "duration_weeks" INTEGER NOT NULL,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "total_hours" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "exam_duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "exam_questions_count" INTEGER NOT NULL DEFAULT 75,
    "validity_years" INTEGER NOT NULL DEFAULT 2,
    "max_retakes_included" INTEGER NOT NULL DEFAULT 2,
    "retake_fee" DECIMAL(10,2) NOT NULL DEFAULT 99.00,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."modules" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "duration_hours" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."lessons" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "lms"."LessonType" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 10,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_free_preview" BOOLEAN NOT NULL DEFAULT false,
    "video_url" TEXT,
    "video_duration_sec" INTEGER,
    "content_body" TEXT,
    "download_url" TEXT,
    "external_url" TEXT,
    "passing_score" INTEGER DEFAULT 70,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."lesson_resources" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."quiz_questions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."exam_bank" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT,
    "topic_tag" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_instructors" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_faqs" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "status" "lms"."ApplicationStatus" NOT NULL DEFAULT 'pending_payment',
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "country" TEXT,
    "career_status" "lms"."CareerStatus",
    "job_title" TEXT,
    "company" TEXT,
    "years_experience" INTEGER,
    "linkedin_url" TEXT,
    "university" TEXT,
    "degree_program" TEXT,
    "graduation_year" INTEGER,
    "motivation" TEXT,
    "how_heard" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "amount_paid" DECIMAL(10,2),
    "payment_status" "lms"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "stripe_refund_id" TEXT,
    "refunded_at" TIMESTAMP(3),
    "refund_amount" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "application_id" TEXT,
    "status" "lms"."EnrollmentStatus" NOT NULL DEFAULT 'active',
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."lesson_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "watch_seconds" INTEGER NOT NULL DEFAULT 0,
    "quiz_score" INTEGER,
    "quiz_passed" BOOLEAN,
    "quiz_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_position" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."exam_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "status" "lms"."ExamAttemptStatus" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "time_limit_seconds" INTEGER,
    "time_used_seconds" INTEGER,
    "total_questions" INTEGER NOT NULL,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "score_percentage" DECIMAL(5,2),
    "passing_score" INTEGER NOT NULL,
    "passed" BOOLEAN,
    "answers" JSONB,
    "topic_breakdown" JSONB,
    "proctor_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."certificates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "status" "lms"."CertificateStatus" NOT NULL DEFAULT 'active',
    "holder_name" TEXT NOT NULL,
    "certification_title" TEXT NOT NULL,
    "certification_acronym" TEXT NOT NULL,
    "exam_score" DECIMAL(5,2) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revocation_reason" TEXT,
    "verification_url" TEXT NOT NULL,
    "qr_code_url" TEXT,
    "pdf_url" TEXT,
    "badge_url" TEXT,
    "linkedin_added" BOOLEAN NOT NULL DEFAULT false,
    "linkedin_added_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "lms"."PaymentType" NOT NULL,
    "status" "lms"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "stripe_charge_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "refund_amount" DECIMAL(10,2),
    "stripe_refund_id" TEXT,
    "refunded_at" TIMESTAMP(3),
    "succeeded_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "lms"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "lms"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "lms"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "lms"."profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "lms"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "lms"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "lms"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "lms"."password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_token_hash_idx" ON "lms"."password_resets"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_slug_key" ON "lms"."certifications"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_acronym_key" ON "lms"."certifications"("acronym");

-- CreateIndex
CREATE INDEX "certifications_slug_idx" ON "lms"."certifications"("slug");

-- CreateIndex
CREATE INDEX "certifications_status_idx" ON "lms"."certifications"("status");

-- CreateIndex
CREATE INDEX "modules_certification_id_sort_order_idx" ON "lms"."modules"("certification_id", "sort_order");

-- CreateIndex
CREATE INDEX "lessons_module_id_sort_order_idx" ON "lms"."lessons"("module_id", "sort_order");

-- CreateIndex
CREATE INDEX "exam_bank_certification_id_is_active_idx" ON "lms"."exam_bank"("certification_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "course_instructors_certification_id_user_id_key" ON "lms"."course_instructors"("certification_id", "user_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "lms"."applications"("status");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "lms"."applications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_certification_id_key" ON "lms"."applications"("user_id", "certification_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_application_id_key" ON "lms"."enrollments"("application_id");

-- CreateIndex
CREATE INDEX "enrollments_user_id_idx" ON "lms"."enrollments"("user_id");

-- CreateIndex
CREATE INDEX "enrollments_certification_id_idx" ON "lms"."enrollments"("certification_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_certification_id_key" ON "lms"."enrollments"("user_id", "certification_id");

-- CreateIndex
CREATE INDEX "lesson_progress_enrollment_id_idx" ON "lms"."lesson_progress"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "lms"."lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "exam_attempts_enrollment_id_idx" ON "lms"."exam_attempts"("enrollment_id");

-- CreateIndex
CREATE INDEX "exam_attempts_user_id_idx" ON "lms"."exam_attempts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_enrollment_id_key" ON "lms"."certificates"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "lms"."certificates"("certificate_number");

-- CreateIndex
CREATE INDEX "certificates_certificate_number_idx" ON "lms"."certificates"("certificate_number");

-- CreateIndex
CREATE INDEX "certificates_user_id_idx" ON "lms"."certificates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "lms"."payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "lms"."payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "lms"."payments"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "lms"."notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "lms"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "lms"."audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "lms"."system_config"("key");

-- AddForeignKey
ALTER TABLE "lms"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."modules" ADD CONSTRAINT "modules_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lessons" ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "lms"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_resources" ADD CONSTRAINT "lesson_resources_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."quiz_questions" ADD CONSTRAINT "quiz_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_bank" ADD CONSTRAINT "exam_bank_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_instructors" ADD CONSTRAINT "course_instructors_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_instructors" ADD CONSTRAINT "course_instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_faqs" ADD CONSTRAINT "course_faqs_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."applications" ADD CONSTRAINT "applications_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."enrollments" ADD CONSTRAINT "enrollments_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."enrollments" ADD CONSTRAINT "enrollments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lms"."applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_attempts" ADD CONSTRAINT "exam_attempts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."certificates" ADD CONSTRAINT "certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."certificates" ADD CONSTRAINT "certificates_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
