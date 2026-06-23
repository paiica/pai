-- Create ExamStatus enum
DO $$ BEGIN
  CREATE TYPE lms."ExamStatus" AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create ExamQuestionType enum
DO $$ BEGIN
  CREATE TYPE lms."ExamQuestionType" AS ENUM (
    'mcq_single', 'mcq_multiple', 'true_false',
    'open_short', 'open_long', 'essay',
    'fill_blank', 'matching', 'ordering',
    'dropdown', 'code'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- structured_exams
CREATE TABLE IF NOT EXISTS lms.structured_exams (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  certification_id TEXT        NOT NULL REFERENCES lms.certifications(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  status           lms."ExamStatus" NOT NULL DEFAULT 'draft',
  version          TEXT,
  passing_score    INTEGER     NOT NULL DEFAULT 70,
  created_by       TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS structured_exams_certification_id_idx ON lms.structured_exams(certification_id);

-- Link exam_sessions to a structured exam
ALTER TABLE lms.exam_sessions ADD COLUMN IF NOT EXISTS structured_exam_id TEXT REFERENCES lms.structured_exams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS exam_sessions_structured_exam_id_idx ON lms.exam_sessions(structured_exam_id);

-- exam_sections
CREATE TABLE IF NOT EXISTS lms.exam_sections (
  id                 TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  exam_id            TEXT        NOT NULL REFERENCES lms.structured_exams(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT,
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER,
  instructions       TEXT,
  is_required        BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS exam_sections_exam_id_sort_order_idx ON lms.exam_sections(exam_id, sort_order);

-- section_instruction_pages
CREATE TABLE IF NOT EXISTS lms.section_instruction_pages (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  section_id TEXT        NOT NULL REFERENCES lms.exam_sections(id) ON DELETE CASCADE,
  title      TEXT,
  content    TEXT        NOT NULL DEFAULT '',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS section_instruction_pages_section_id_idx ON lms.section_instruction_pages(section_id);

-- exam_questions
CREATE TABLE IF NOT EXISTS lms.exam_questions (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  section_id    TEXT        NOT NULL REFERENCES lms.exam_sections(id) ON DELETE CASCADE,
  type          lms."ExamQuestionType" NOT NULL DEFAULT 'mcq_single',
  question_text TEXT        NOT NULL DEFAULT '',
  explanation   TEXT,
  points        INTEGER     NOT NULL DEFAULT 1,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  is_required   BOOLEAN     NOT NULL DEFAULT true,
  metadata      JSONB,
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS exam_questions_section_id_sort_order_idx ON lms.exam_questions(section_id, sort_order);

-- question_options
CREATE TABLE IF NOT EXISTS lms.question_options (
  id          TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  question_id TEXT    NOT NULL REFERENCES lms.exam_questions(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL DEFAULT '',
  is_correct  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  match_text  TEXT
);
CREATE INDEX IF NOT EXISTS question_options_question_id_idx ON lms.question_options(question_id);

-- question_images
CREATE TABLE IF NOT EXISTS lms.question_images (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  question_id TEXT        NOT NULL REFERENCES lms.exam_questions(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  alt_text    TEXT,
  caption     TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS question_images_question_id_idx ON lms.question_images(question_id);

-- attempt_sections
CREATE TABLE IF NOT EXISTS lms.attempt_sections (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  attempt_id        TEXT        NOT NULL REFERENCES lms.exam_attempts(id) ON DELETE CASCADE,
  section_id        TEXT        NOT NULL REFERENCES lms.exam_sections(id),
  status            TEXT        NOT NULL DEFAULT 'not_started',
  started_at        TIMESTAMP(3),
  submitted_at      TIMESTAMP(3),
  time_used_seconds INTEGER,
  UNIQUE(attempt_id, section_id)
);
CREATE INDEX IF NOT EXISTS attempt_sections_attempt_id_idx ON lms.attempt_sections(attempt_id);

-- student_answers
CREATE TABLE IF NOT EXISTS lms.student_answers (
  id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  attempt_id          TEXT        NOT NULL REFERENCES lms.exam_attempts(id) ON DELETE CASCADE,
  question_id         TEXT        NOT NULL REFERENCES lms.exam_questions(id),
  selected_option_ids JSONB,
  answer_text         TEXT,
  answer_json         JSONB,
  is_correct          BOOLEAN,
  points_awarded      INTEGER,
  answered_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS student_answers_attempt_id_idx ON lms.student_answers(attempt_id);
