-- Holders of a certification get a member discount on prep course purchases.
-- 0 = no discount (default, opt-in per certification from the admin editor).
ALTER TABLE "lms"."certifications" ADD COLUMN "member_discount_percentage" INTEGER NOT NULL DEFAULT 0;
