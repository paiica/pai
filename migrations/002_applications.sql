-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  certification_id TEXT NOT NULL,

  -- Personal Info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  country TEXT,

  -- Career / Education
  career_status TEXT NOT NULL DEFAULT 'professional',
  job_title TEXT,
  company TEXT,
  years_experience INTEGER,
  linkedin_url TEXT,
  university TEXT,
  degree TEXT,
  graduation_year INTEGER,
  other_background TEXT,

  -- Motivation
  motivation TEXT,
  how_heard TEXT,

  -- Payment
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER,
  currency TEXT DEFAULT 'usd',

  -- Review
  status TEXT NOT NULL DEFAULT 'pending_payment',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_certification_id ON public.applications(certification_id);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow service role full access (for webhooks and admin routes)
-- Service role bypasses RLS by default, so no explicit policy needed.
