-- Rename eligible_job_titles to industry_focus (no data loss — column only ever held empty default arrays)
ALTER TABLE "lms"."certifications" RENAME COLUMN "eligible_job_titles" TO "industry_focus";
