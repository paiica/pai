-- Deleting a user should also remove any AffiliateLead tied to them, rather
-- than leaving a stale lead row (with its own cached email/name) that keeps
-- rendering on the leads page after the underlying account is gone.
ALTER TABLE "lms"."affiliate_leads" DROP CONSTRAINT "affiliate_leads_user_id_fkey";
ALTER TABLE "lms"."affiliate_leads" ADD CONSTRAINT "affiliate_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
