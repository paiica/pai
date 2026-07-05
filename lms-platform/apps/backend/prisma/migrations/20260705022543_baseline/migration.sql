-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "lms";

-- CreateEnum
CREATE TYPE "lms"."Role" AS ENUM ('super_admin', 'admin', 'professor', 'student', 'sales_rep');

-- CreateEnum
CREATE TYPE "lms"."AffiliateStatus" AS ENUM ('pending', 'approved', 'suspended');

-- CreateEnum
CREATE TYPE "lms"."AffiliateCommissionStatus" AS ENUM ('pending', 'approved', 'paid', 'voided');

-- CreateEnum
CREATE TYPE "lms"."AffiliateLeadStatus" AS ENUM ('invited', 'registered', 'logged_in', 'purchased');

-- CreateEnum
CREATE TYPE "lms"."AffiliateInviteStatus" AS ENUM ('pending', 'registered', 'converted');

-- CreateEnum
CREATE TYPE "lms"."ApplicationStatus" AS ENUM ('pending_payment', 'payment_submitted', 'pending_review', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "lms"."EnrollmentStatus" AS ENUM ('active', 'completed', 'suspended', 'expired');

-- CreateEnum
CREATE TYPE "lms"."LessonType" AS ENUM ('video', 'reading', 'quiz', 'assignment', 'live_session', 'download', 'html');

-- CreateEnum
CREATE TYPE "lms"."QuestionType" AS ENUM ('multiple_choice', 'true_false', 'short_answer');

-- CreateEnum
CREATE TYPE "lms"."SubmissionStatus" AS ENUM ('submitted', 'under_review', 'graded', 'returned');

-- CreateEnum
CREATE TYPE "lms"."ExamAttemptStatus" AS ENUM ('in_progress', 'passed', 'failed', 'abandoned');

-- CreateEnum
CREATE TYPE "lms"."CertificateStatus" AS ENUM ('active', 'expired', 'revoked', 'suspended');

-- CreateEnum
CREATE TYPE "lms"."ExamStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "lms"."ExamQuestionType" AS ENUM ('mcq_single', 'mcq_multiple', 'true_false', 'open_short', 'open_long', 'essay', 'fill_blank', 'matching', 'ordering', 'dropdown', 'code', 'html');

-- CreateEnum
CREATE TYPE "lms"."PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "lms"."PaymentType" AS ENUM ('enrollment', 'retake_fee', 'renewal_fee', 'corporate_bundle', 'event_registration');

-- CreateEnum
CREATE TYPE "lms"."EventType" AS ENUM ('online', 'in_person', 'hybrid');

-- CreateEnum
CREATE TYPE "lms"."EventStatus" AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "lms"."EventRegistrationStatus" AS ENUM ('registered', 'cancelled');

-- CreateEnum
CREATE TYPE "lms"."NotificationType" AS ENUM ('application_submitted', 'application_approved', 'application_rejected', 'enrollment_created', 'lesson_completed', 'module_completed', 'course_completed', 'exam_passed', 'exam_failed', 'certificate_issued', 'certificate_expiring', 'payment_succeeded', 'payment_failed', 'assignment_submitted', 'assignment_graded', 'system_announcement');

-- CreateEnum
CREATE TYPE "lms"."CareerStatus" AS ENUM ('professional', 'student', 'other');

-- CreateEnum
CREATE TYPE "lms"."CertificationLevel" AS ENUM ('pre_certificate', 'foundation', 'advanced', 'executive', 'specialist');

-- CreateEnum
CREATE TYPE "lms"."CertificationStatus" AS ENUM ('active', 'archived', 'coming_soon');

-- CreateEnum
CREATE TYPE "lms"."CourseStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "lms"."CourseLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateTable
CREATE TABLE "lms"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "email_verify_token_expires_at" TIMESTAMP(3),
    "pending_email" TEXT,
    "email_change_token_hash" TEXT,
    "email_change_expires_at" TIMESTAMP(3),
    "password_hash" TEXT NOT NULL,
    "pending_referral_code" TEXT,
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
    "nationality" TEXT,
    "pai_id" TEXT,
    "education_entries" JSONB NOT NULL DEFAULT '[]',
    "experience_entries" JSONB NOT NULL DEFAULT '[]',
    "addresses" JSONB NOT NULL DEFAULT '[]',
    "resume_url" TEXT,
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
    "curriculum_overview" JSONB NOT NULL DEFAULT '[]',
    "faqs_json" JSONB NOT NULL DEFAULT '[]',
    "marketing_meta" JSONB NOT NULL DEFAULT '{}',
    "testimonials" JSONB NOT NULL DEFAULT '[]',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificate_preview_url" TEXT NOT NULL DEFAULT '',
    "min_years_experience" INTEGER,
    "min_training_hours" INTEGER,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."modules" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT,
    "course_id" TEXT,
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
    "allow_download" BOOLEAN NOT NULL DEFAULT true,
    "external_url" TEXT,
    "passing_score" INTEGER DEFAULT 70,
    "max_attempts" INTEGER DEFAULT 3,
    "time_limit_minutes" INTEGER,
    "due_date" TIMESTAMP(3),
    "max_score" INTEGER DEFAULT 100,
    "allow_text_response" BOOLEAN NOT NULL DEFAULT true,
    "text_word_limit" INTEGER,
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
    "question_type" "lms"."QuestionType" NOT NULL DEFAULT 'multiple_choice',
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

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
CREATE TABLE "lms"."courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "lms"."CourseStatus" NOT NULL DEFAULT 'draft',
    "thumbnail_url" TEXT,
    "preview_video_url" TEXT,
    "level" "lms"."CourseLevel" NOT NULL DEFAULT 'beginner',
    "duration_hours" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB,
    "certification_id" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_documents" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_teachers" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "stripe_payment_intent_id" TEXT,
    "amount_paid" DECIMAL(10,2),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."course_cert_recommendations" (
    "course_id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,

    CONSTRAINT "course_cert_recommendations_pkey" PRIMARY KEY ("course_id","certification_id")
);

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
    "training_hours" INTEGER,
    "linkedin_url" TEXT,
    "university" TEXT,
    "degree_program" TEXT,
    "graduation_year" INTEGER,
    "motivation" TEXT,
    "how_heard" TEXT,
    "education_entries" JSONB NOT NULL DEFAULT '[]',
    "experience_entries" JSONB NOT NULL DEFAULT '[]',
    "documents_requested" BOOLEAN NOT NULL DEFAULT false,
    "documents_request_message" TEXT,
    "documents_requested_at" TIMESTAMP(3),
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "amount_paid" DECIMAL(10,2),
    "payment_status" "lms"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "promo_code" TEXT,
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
CREATE TABLE "lms"."application_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "lms"."assignment_submissions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrollment_id" TEXT,
    "course_enrollment_id" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "text_content" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
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
CREATE TABLE "lms"."exam_sessions" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "structured_exam_id" TEXT,
    "title" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "max_seats" INTEGER,
    "meeting_link" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allow_late_cancellation" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."exam_bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_session_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "exam_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."structured_exams" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "lms"."ExamStatus" NOT NULL DEFAULT 'draft',
    "version" TEXT,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structured_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."exam_sections" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "time_limit_minutes" INTEGER,
    "instructions" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."section_instruction_pages" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_instruction_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."exam_questions" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "type" "lms"."ExamQuestionType" NOT NULL DEFAULT 'mcq_single',
    "question_text" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "match_text" TEXT,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."question_images" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."attempt_sections" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "time_used_seconds" INTEGER,

    CONSTRAINT "attempt_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."student_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_option_ids" JSONB,
    "answer_text" TEXT,
    "answer_json" JSONB,
    "is_correct" BOOLEAN,
    "points_awarded" INTEGER,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
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
    "stripe_receipt_url" TEXT,
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

-- CreateTable
CREATE TABLE "lms"."page_blocks" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_blocks_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "lms"."nav_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "open_new_tab" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "meta_description" TEXT NOT NULL DEFAULT '',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "cover_image_url" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "author_name" TEXT NOT NULL DEFAULT '',
    "author_avatar" TEXT NOT NULL DEFAULT '',
    "reading_time" TEXT NOT NULL DEFAULT '',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "cover_image_url" TEXT,
    "promo_video_url" TEXT,
    "event_type" "lms"."EventType" NOT NULL DEFAULT 'online',
    "location_address" TEXT,
    "meeting_link" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "capacity" INTEGER,
    "status" "lms"."EventStatus" NOT NULL DEFAULT 'draft',
    "speakers" JSONB,
    "agenda" JSONB,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."event_registrations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "lms"."EventRegistrationStatus" NOT NULL DEFAULT 'registered',
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."online_tools" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "offered_by" TEXT,
    "tool_type" TEXT NOT NULL DEFAULT 'course',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "member_price" DECIMAL(10,2),
    "billing_type" TEXT NOT NULL DEFAULT 'one_time',
    "short_description" TEXT,
    "overview" TEXT,
    "thumbnail_url" TEXT,
    "badge_text" TEXT,
    "cta_label" TEXT NOT NULL DEFAULT 'Add To Cart',
    "cta_url" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "how_it_works" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "course_id" TEXT,
    "certification_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "max_uses" INTEGER,
    "max_uses_per_user" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "course_id" TEXT,
    "certification_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."assignments" (
    "id" TEXT NOT NULL,
    "certification_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'assignment',
    "description" TEXT,
    "instructions" TEXT,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "due_date" TIMESTAMP(3),
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "grades_released" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."assignment_entries" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "section_responses" JSONB NOT NULL DEFAULT '[]',
    "text_content" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "graded_by" TEXT,
    "graded_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."promo_redemptions" (
    "id" TEXT NOT NULL,
    "promo_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."affiliate_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "status" "lms"."AffiliateStatus" NOT NULL DEFAULT 'pending',
    "payout_method" TEXT,
    "payout_details" TEXT,
    "notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."affiliate_product_assignments" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "certification_id" TEXT,
    "course_id" TEXT,
    "commission_override" DECIMAL(5,2),
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_product_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."affiliate_promo_codes" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL DEFAULT 'percent',
    "discount_value" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "min_order_value" DECIMAL(10,2),
    "is_stackable" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."affiliate_leads" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "certification_id" TEXT,
    "course_id" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "status" "lms"."AffiliateLeadStatus" NOT NULL DEFAULT 'invited',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "affiliate_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."affiliate_commissions" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "user_id" TEXT,
    "lead_id" TEXT,
    "certification_id" TEXT,
    "course_id" TEXT,
    "sale_amount" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "promo_code" TEXT,
    "status" "lms"."AffiliateCommissionStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms"."affiliate_invites" (
    "id" TEXT NOT NULL,
    "affiliate_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" "lms"."AffiliateInviteStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "lms"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_change_token_hash_key" ON "lms"."users"("email_change_token_hash");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "lms"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "lms"."profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_pai_id_key" ON "lms"."profiles"("pai_id");

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
CREATE INDEX "modules_course_id_sort_order_idx" ON "lms"."modules"("course_id", "sort_order");

-- CreateIndex
CREATE INDEX "lessons_module_id_sort_order_idx" ON "lms"."lessons"("module_id", "sort_order");

-- CreateIndex
CREATE INDEX "quiz_questions_lesson_id_idx" ON "lms"."quiz_questions"("lesson_id");

-- CreateIndex
CREATE INDEX "exam_bank_certification_id_is_active_idx" ON "lms"."exam_bank"("certification_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "course_instructors_certification_id_user_id_key" ON "lms"."course_instructors"("certification_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "lms"."courses"("slug");

-- CreateIndex
CREATE INDEX "courses_slug_idx" ON "lms"."courses"("slug");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "lms"."courses"("status");

-- CreateIndex
CREATE INDEX "course_documents_course_id_sort_order_idx" ON "lms"."course_documents"("course_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "course_teachers_course_id_user_id_key" ON "lms"."course_teachers"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "course_enrollments_user_id_idx" ON "lms"."course_enrollments"("user_id");

-- CreateIndex
CREATE INDEX "course_enrollments_course_id_idx" ON "lms"."course_enrollments"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_user_id_course_id_key" ON "lms"."course_enrollments"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "uploaded_files_owner_id_idx" ON "lms"."uploaded_files"("owner_id");

-- CreateIndex
CREATE INDEX "uploaded_files_lesson_id_idx" ON "lms"."uploaded_files"("lesson_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "lms"."applications"("status");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "lms"."applications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_certification_id_key" ON "lms"."applications"("user_id", "certification_id");

-- CreateIndex
CREATE INDEX "application_documents_application_id_idx" ON "lms"."application_documents"("application_id");

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
CREATE INDEX "assignment_submissions_enrollment_id_idx" ON "lms"."assignment_submissions"("enrollment_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_course_enrollment_id_idx" ON "lms"."assignment_submissions"("course_enrollment_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_lesson_id_idx" ON "lms"."assignment_submissions"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_lesson_id_user_id_key" ON "lms"."assignment_submissions"("lesson_id", "user_id");

-- CreateIndex
CREATE INDEX "exam_attempts_enrollment_id_idx" ON "lms"."exam_attempts"("enrollment_id");

-- CreateIndex
CREATE INDEX "exam_attempts_user_id_idx" ON "lms"."exam_attempts"("user_id");

-- CreateIndex
CREATE INDEX "exam_sessions_certification_id_idx" ON "lms"."exam_sessions"("certification_id");

-- CreateIndex
CREATE INDEX "exam_sessions_scheduled_at_idx" ON "lms"."exam_sessions"("scheduled_at");

-- CreateIndex
CREATE INDEX "exam_bookings_user_id_idx" ON "lms"."exam_bookings"("user_id");

-- CreateIndex
CREATE INDEX "exam_bookings_exam_session_id_idx" ON "lms"."exam_bookings"("exam_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_bookings_user_id_exam_session_id_key" ON "lms"."exam_bookings"("user_id", "exam_session_id");

-- CreateIndex
CREATE INDEX "structured_exams_certification_id_idx" ON "lms"."structured_exams"("certification_id");

-- CreateIndex
CREATE INDEX "exam_sections_exam_id_sort_order_idx" ON "lms"."exam_sections"("exam_id", "sort_order");

-- CreateIndex
CREATE INDEX "section_instruction_pages_section_id_idx" ON "lms"."section_instruction_pages"("section_id");

-- CreateIndex
CREATE INDEX "exam_questions_section_id_sort_order_idx" ON "lms"."exam_questions"("section_id", "sort_order");

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "lms"."question_options"("question_id");

-- CreateIndex
CREATE INDEX "question_images_question_id_idx" ON "lms"."question_images"("question_id");

-- CreateIndex
CREATE INDEX "attempt_sections_attempt_id_idx" ON "lms"."attempt_sections"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_sections_attempt_id_section_id_key" ON "lms"."attempt_sections"("attempt_id", "section_id");

-- CreateIndex
CREATE INDEX "student_answers_attempt_id_idx" ON "lms"."student_answers"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_answers_attempt_id_question_id_key" ON "lms"."student_answers"("attempt_id", "question_id");

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

-- CreateIndex
CREATE INDEX "nav_items_parent_id_idx" ON "lms"."nav_items"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "lms"."pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "lms"."blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "lms"."events"("slug");

-- CreateIndex
CREATE INDEX "events_slug_idx" ON "lms"."events"("slug");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "lms"."events"("status");

-- CreateIndex
CREATE INDEX "event_registrations_event_id_idx" ON "lms"."event_registrations"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_event_id_email_key" ON "lms"."event_registrations"("event_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "online_tools_slug_key" ON "lms"."online_tools"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "lms"."promo_codes"("code");

-- CreateIndex
CREATE INDEX "assignments_certification_id_idx" ON "lms"."assignments"("certification_id");

-- CreateIndex
CREATE INDEX "assignment_entries_assignment_id_idx" ON "lms"."assignment_entries"("assignment_id");

-- CreateIndex
CREATE INDEX "assignment_entries_user_id_idx" ON "lms"."assignment_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_entries_assignment_id_user_id_key" ON "lms"."assignment_entries"("assignment_id", "user_id");

-- CreateIndex
CREATE INDEX "promo_redemptions_promo_id_user_id_idx" ON "lms"."promo_redemptions"("promo_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_profiles_user_id_key" ON "lms"."affiliate_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_profiles_referral_code_key" ON "lms"."affiliate_profiles"("referral_code");

-- CreateIndex
CREATE INDEX "affiliate_product_assignments_affiliate_id_idx" ON "lms"."affiliate_product_assignments"("affiliate_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_promo_codes_code_key" ON "lms"."affiliate_promo_codes"("code");

-- CreateIndex
CREATE INDEX "affiliate_promo_codes_affiliate_id_idx" ON "lms"."affiliate_promo_codes"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_leads_affiliate_id_idx" ON "lms"."affiliate_leads"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_leads_user_id_idx" ON "lms"."affiliate_leads"("user_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_affiliate_id_status_idx" ON "lms"."affiliate_commissions"("affiliate_id", "status");

-- CreateIndex
CREATE INDEX "affiliate_commissions_user_id_certification_id_idx" ON "lms"."affiliate_commissions"("user_id", "certification_id");

-- CreateIndex
CREATE INDEX "affiliate_invites_affiliate_id_idx" ON "lms"."affiliate_invites"("affiliate_id");

-- AddForeignKey
ALTER TABLE "lms"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."modules" ADD CONSTRAINT "modules_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "lms"."courses" ADD CONSTRAINT "courses_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_documents" ADD CONSTRAINT "course_documents_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_teachers" ADD CONSTRAINT "course_teachers_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_teachers" ADD CONSTRAINT "course_teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_cert_recommendations" ADD CONSTRAINT "course_cert_recommendations_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."course_cert_recommendations" ADD CONSTRAINT "course_cert_recommendations_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."uploaded_files" ADD CONSTRAINT "uploaded_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."uploaded_files" ADD CONSTRAINT "uploaded_files_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."applications" ADD CONSTRAINT "applications_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "lms"."applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."application_documents" ADD CONSTRAINT "application_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lms"."lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_course_enrollment_id_fkey" FOREIGN KEY ("course_enrollment_id") REFERENCES "lms"."course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_submissions" ADD CONSTRAINT "assignment_submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "lms"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_attempts" ADD CONSTRAINT "exam_attempts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_sessions" ADD CONSTRAINT "exam_sessions_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_sessions" ADD CONSTRAINT "exam_sessions_structured_exam_id_fkey" FOREIGN KEY ("structured_exam_id") REFERENCES "lms"."structured_exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_bookings" ADD CONSTRAINT "exam_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_bookings" ADD CONSTRAINT "exam_bookings_exam_session_id_fkey" FOREIGN KEY ("exam_session_id") REFERENCES "lms"."exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_bookings" ADD CONSTRAINT "exam_bookings_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "lms"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."structured_exams" ADD CONSTRAINT "structured_exams_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_sections" ADD CONSTRAINT "exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "lms"."structured_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."section_instruction_pages" ADD CONSTRAINT "section_instruction_pages_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "lms"."exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."exam_questions" ADD CONSTRAINT "exam_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "lms"."exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lms"."exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."question_images" ADD CONSTRAINT "question_images_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lms"."exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."attempt_sections" ADD CONSTRAINT "attempt_sections_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "lms"."exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."attempt_sections" ADD CONSTRAINT "attempt_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "lms"."exam_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."student_answers" ADD CONSTRAINT "student_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "lms"."exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."student_answers" ADD CONSTRAINT "student_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lms"."exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "lms"."nav_items" ADD CONSTRAINT "nav_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "lms"."nav_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "lms"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignments" ADD CONSTRAINT "assignments_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_entries" ADD CONSTRAINT "assignment_entries_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "lms"."assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_entries" ADD CONSTRAINT "assignment_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."assignment_entries" ADD CONSTRAINT "assignment_entries_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "lms"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "lms"."promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_profiles" ADD CONSTRAINT "affiliate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_product_assignments" ADD CONSTRAINT "affiliate_product_assignments_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "lms"."affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_product_assignments" ADD CONSTRAINT "affiliate_product_assignments_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_product_assignments" ADD CONSTRAINT "affiliate_product_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_promo_codes" ADD CONSTRAINT "affiliate_promo_codes_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "lms"."affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_leads" ADD CONSTRAINT "affiliate_leads_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "lms"."affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_leads" ADD CONSTRAINT "affiliate_leads_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_leads" ADD CONSTRAINT "affiliate_leads_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_leads" ADD CONSTRAINT "affiliate_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "lms"."affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lms"."affiliate_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."affiliate_invites" ADD CONSTRAINT "affiliate_invites_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "lms"."affiliate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

