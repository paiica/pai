-- ============================================================
-- Professional AI Institute (PAI) — Database Schema
-- Supabase / PostgreSQL
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email          TEXT NOT NULL,
  full_name      TEXT,
  avatar_url     TEXT,
  role           TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'instructor')),
  company        TEXT,
  job_title      TEXT,
  linkedin_url   TEXT,
  phone          TEXT,
  timezone       TEXT DEFAULT 'UTC',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CERTIFICATIONS
-- ============================================================
CREATE TABLE certifications (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                   TEXT UNIQUE NOT NULL,
  title                  TEXT NOT NULL,
  acronym                TEXT NOT NULL UNIQUE,
  description            TEXT NOT NULL,
  long_description       TEXT,
  level                  TEXT NOT NULL CHECK (level IN ('foundation', 'professional', 'specialist', 'executive')),
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'coming_soon', 'draft', 'archived')),
  price                  NUMERIC(10, 2) NOT NULL,
  stripe_price_id        TEXT,
  duration_weeks         INTEGER NOT NULL DEFAULT 8,
  exam_duration_minutes  INTEGER NOT NULL DEFAULT 90,
  passing_score          INTEGER NOT NULL DEFAULT 70,
  validity_years         INTEGER NOT NULL DEFAULT 3,
  badge_icon             TEXT DEFAULT '🏆',
  color_scheme           TEXT DEFAULT 'navy-gold',
  learning_outcomes      TEXT[] DEFAULT '{}',
  curriculum_json        JSONB DEFAULT '[]',
  faqs_json              JSONB DEFAULT '[]',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULES
-- ============================================================
CREATE TABLE modules (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_id   UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  order_index        INTEGER NOT NULL DEFAULT 0,
  duration_hours     NUMERIC(4, 1) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE lessons (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id          UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  type               TEXT NOT NULL CHECK (type IN ('video', 'reading', 'quiz', 'assignment', 'live')),
  duration_minutes   INTEGER NOT NULL DEFAULT 30,
  content_url        TEXT,
  is_preview         BOOLEAN DEFAULT FALSE,
  order_index        INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
CREATE TABLE enrollments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_id     UUID NOT NULL REFERENCES certifications(id) ON DELETE RESTRICT,
  status               TEXT NOT NULL DEFAULT 'enrolled'
                         CHECK (status IN ('enrolled', 'in_progress', 'completed', 'failed', 'refunded')),
  progress_percentage  INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  enrolled_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  payment_id           TEXT,
  UNIQUE (user_id, certification_id)
);

-- ============================================================
-- LESSON PROGRESS
-- ============================================================
CREATE TABLE lesson_progress (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id      UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  enrollment_id  UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  completed      BOOLEAN DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

-- ============================================================
-- EXAMS
-- ============================================================
CREATE TABLE exams (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_id    UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'final' CHECK (type IN ('practice', 'final')),
  total_questions     INTEGER NOT NULL DEFAULT 75,
  time_limit_minutes  INTEGER NOT NULL DEFAULT 90,
  passing_score       INTEGER NOT NULL DEFAULT 70,
  randomize_questions BOOLEAN DEFAULT TRUE,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXAM ATTEMPTS
-- ============================================================
CREATE TABLE exam_attempts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id             UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  enrollment_id       UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  attempt_number      INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed', 'abandoned', 'timed_out')),
  score               INTEGER,
  passed              BOOLEAN,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  answers_json        JSONB DEFAULT '{}'
);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE certificates (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id          TEXT UNIQUE NOT NULL,  -- e.g. CAIP-2026-00001
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_id        UUID NOT NULL REFERENCES certifications(id) ON DELETE RESTRICT,
  student_name            TEXT NOT NULL,
  student_email           TEXT NOT NULL,
  certification_title     TEXT NOT NULL,
  certification_acronym   TEXT NOT NULL,
  issue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date             DATE NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'expired', 'revoked', 'suspended')),
  score                   INTEGER NOT NULL,
  certificate_url         TEXT,
  issued_by               UUID REFERENCES auth.users(id),
  revocation_reason       TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence for certificate IDs per acronym
CREATE SEQUENCE certificate_sequence START 1;

-- Function to generate certificate IDs
CREATE OR REPLACE FUNCTION generate_certificate_id(acronym TEXT, issue_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('certificate_sequence');
  RETURN acronym || '-' || issue_year::TEXT || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICATION RECORDS (audit log)
-- ============================================================
CREATE TABLE verification_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id    TEXT NOT NULL,
  verified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verifier_ip       INET,
  verifier_agent    TEXT,
  result            TEXT NOT NULL CHECK (result IN ('found', 'not_found')),
  certificate_uuid  UUID REFERENCES certificates(id)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_id           UUID REFERENCES certifications(id),
  stripe_payment_intent_id   TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  amount                     NUMERIC(10, 2) NOT NULL,
  currency                   TEXT NOT NULL DEFAULT 'usd',
  status                     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'disputed')),
  invoice_url                TEXT,
  receipt_url                TEXT,
  metadata                   JSONB DEFAULT '{}',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TESTIMONIALS
-- ============================================================
CREATE TABLE testimonials (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                     TEXT NOT NULL,
  role                     TEXT NOT NULL,
  company                  TEXT NOT NULL,
  content                  TEXT NOT NULL,
  rating                   INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  avatar_url               TEXT,
  certification_acronym    TEXT,
  featured                 BOOLEAN DEFAULT FALSE,
  approved                 BOOLEAN DEFAULT FALSE,
  user_id                  UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CORPORATE INQUIRIES
-- ============================================================
CREATE TABLE corporate_inquiries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  company      TEXT NOT NULL,
  job_title    TEXT NOT NULL,
  seats        TEXT NOT NULL,
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Helper: check admin role
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (is_admin(auth.uid()));

-- CERTIFICATIONS policies (public read, admin write)
CREATE POLICY "Anyone can view active certifications"
  ON certifications FOR SELECT USING (status IN ('active', 'coming_soon'));

CREATE POLICY "Admins can manage certifications"
  ON certifications FOR ALL USING (is_admin(auth.uid()));

-- ENROLLMENTS policies
CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert enrollments"
  ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- CERTIFICATES policies
CREATE POLICY "Users can view own certificates"
  ON certificates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can verify by certificate_id"
  ON certificates FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL USING (is_admin(auth.uid()));

-- PAYMENTS policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT USING (is_admin(auth.uid()));

-- VERIFICATION RECORDS (anyone can verify, logs are admin-only)
CREATE POLICY "Public verification access"
  ON verification_records FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view verification logs"
  ON verification_records FOR SELECT USING (is_admin(auth.uid()));

-- TESTIMONIALS (public approved ones, admin manages all)
CREATE POLICY "Anyone can view approved testimonials"
  ON testimonials FOR SELECT USING (approved = TRUE);

CREATE POLICY "Admins can manage testimonials"
  ON testimonials FOR ALL USING (is_admin(auth.uid()));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_cert ON enrollments(certification_id);
CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_cert_id ON certificates(certificate_id);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_verification_records_cert ON verification_records(certificate_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- SAMPLE DATA (for development)
-- ============================================================

-- Insert CAIP certification
INSERT INTO certifications (
  id, slug, title, acronym, description, long_description,
  level, status, price, duration_weeks, exam_duration_minutes,
  passing_score, validity_years, badge_icon
) VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'certified-ai-professional',
  'Certified AI Professional',
  'CAIP',
  'The foundational professional credential for business professionals who want to harness AI effectively.',
  'The CAIP designation equips business professionals with the knowledge, frameworks, and practical skills needed to understand, evaluate, and implement AI solutions.',
  'professional',
  'active',
  495.00,
  8,
  90,
  70,
  3,
  '🏆'
);

-- Insert sample verified certificate (for demo/testing)
INSERT INTO certificates (
  certificate_id, user_id, certification_id,
  student_name, student_email,
  certification_title, certification_acronym,
  issue_date, expiry_date, status, score
) VALUES (
  'CAIP-2026-00001',
  '00000000-0000-0000-0000-000000000000',  -- placeholder
  'a0000001-0000-0000-0000-000000000001',
  'Demo Graduate',
  'demo@example.com',
  'Certified AI Professional',
  'CAIP',
  '2026-01-15',
  '2029-01-15',
  'active',
  82
) ON CONFLICT (certificate_id) DO NOTHING;
