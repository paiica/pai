-- AlterTable
ALTER TABLE "lms"."course_cert_recommendations" ADD COLUMN     "is_free" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: courses that were only ever linked via the direct
-- Course.certification_id FK (no course_cert_recommendations row at all)
-- get one created as required+free, preserving their pre-migration
-- behavior — bundled free with the certification, part of its main
-- curriculum. Courses that already have a recommendation row (e.g. from
-- the Prep Courses tab) are left untouched.
INSERT INTO "lms"."course_cert_recommendations" (course_id, certification_id, is_required, is_free)
SELECT c.id, c.certification_id, true, true
FROM "lms"."courses" c
WHERE c.certification_id IS NOT NULL
ON CONFLICT (course_id, certification_id) DO NOTHING;
