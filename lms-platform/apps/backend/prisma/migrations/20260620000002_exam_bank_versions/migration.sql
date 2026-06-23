-- Create exam versions table (the exam bank)
CREATE TABLE IF NOT EXISTS lms.exams (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id TEXT        NOT NULL REFERENCES lms.certifications(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  version          TEXT,
  description      TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exams_certification_id_idx ON lms.exams(certification_id);

-- Associate exam_bank questions with a specific exam version
ALTER TABLE lms.exam_bank ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES lms.exams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS exam_bank_exam_id_idx ON lms.exam_bank(exam_id);

-- Link exam sessions to a specific exam version
ALTER TABLE lms.exam_sessions ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES lms.exams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS exam_sessions_exam_id_idx ON lms.exam_sessions(exam_id);
