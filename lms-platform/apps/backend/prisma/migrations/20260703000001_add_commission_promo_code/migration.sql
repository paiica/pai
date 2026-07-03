-- Add promo_code to affiliate_commissions
-- Records which promo code (if any) triggered this commission at the time
-- the sale completed, so the admin Commissions page can show it directly
-- instead of requiring a manual cross-reference to the Application record.
ALTER TABLE "lms"."affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "promo_code" TEXT;
