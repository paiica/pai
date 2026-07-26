-- Certification.badge_icon now stores a Lucide icon key (e.g. "shield-check")
-- instead of a raw emoji, so every cert badge renders on the same stroke-icon
-- visual language as the rest of the product instead of mismatched emoji.

ALTER TABLE "lms"."certifications" ALTER COLUMN "badge_icon" SET DEFAULT 'graduation-cap';

-- Map each existing certification's current emoji to a fitting icon key.
UPDATE "lms"."certifications" SET "badge_icon" = CASE "acronym"
  WHEN 'AI101' THEN 'compass'
  WHEN 'AIDA'  THEN 'bar-chart'
  WHEN 'CAIE'  THEN 'graduation-cap'
  WHEN 'CAIM'  THEN 'briefcase'
  WHEN 'CAIP'  THEN 'shield-check'
  ELSE "badge_icon"
END;

-- Safety net: any certification whose badge_icon isn't already one of the
-- known icon keys (e.g. a leftover emoji from before this migration) falls
-- back to the default icon.
UPDATE "lms"."certifications" SET "badge_icon" = 'graduation-cap'
WHERE "badge_icon" NOT IN (
  'graduation-cap', 'award', 'shield-check', 'target', 'compass',
  'bar-chart', 'briefcase', 'layers', 'network', 'brain', 'cpu', 'line-chart'
);
