-- Add content to courses table
-- Marketing content for the public course detail page (overview, learning
-- outcomes, how-it-works steps, exam prep, related courses). Previously
-- referenced by the admin course editor and adminUpdate's raw SQL without
-- ever being migrated, causing "column content does not exist" on save.
ALTER TABLE "lms"."courses"
  ADD COLUMN IF NOT EXISTS "content" JSONB;
