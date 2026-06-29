-- Add pending_referral_code to users table
-- Stores the referral code from the invite link until email is verified,
-- at which point an AffiliateLead record is created and this is cleared.
ALTER TABLE "lms"."users"
  ADD COLUMN IF NOT EXISTS "pending_referral_code" TEXT;
