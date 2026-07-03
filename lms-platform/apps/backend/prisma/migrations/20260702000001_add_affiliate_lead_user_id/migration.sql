-- Add user_id to affiliate_leads
-- Set once, at email verification, from the referred visitor's own account.
-- This is a permanent link that survives the same person later using a
-- different email address on an application form -- unlike the existing
-- `email` column, which only matches when the two emails are identical.
ALTER TABLE "lms"."affiliate_leads"
  ADD COLUMN IF NOT EXISTS "user_id" TEXT;

ALTER TABLE "lms"."affiliate_leads"
  ADD CONSTRAINT "affiliate_leads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "affiliate_leads_user_id_idx" ON "lms"."affiliate_leads"("user_id");
