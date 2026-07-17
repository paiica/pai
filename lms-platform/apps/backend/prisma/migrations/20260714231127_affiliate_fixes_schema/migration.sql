-- Standardize AffiliatePromoCode.discount_type default on "percentage" to
-- match the general PromoCode system (was "percent", causing a mismatch
-- with backend validation and the admin UI's default selection).
ALTER TABLE "lms"."affiliate_promo_codes" ALTER COLUMN "discount_type" SET DEFAULT 'percentage';

-- Correlates an AffiliateCommission back to the Payment that generated it
-- (Payment.stripe_payment_intent_id is unique), so a refund can find and
-- void the associated commission.
ALTER TABLE "lms"."affiliate_commissions" ADD COLUMN "stripe_payment_intent_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_stripe_payment_intent_id_key" ON "lms"."affiliate_commissions"("stripe_payment_intent_id");
