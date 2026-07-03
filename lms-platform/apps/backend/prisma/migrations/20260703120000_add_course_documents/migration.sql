CREATE TABLE "lms"."course_documents" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_documents_course_id_sort_order_idx" ON "lms"."course_documents"("course_id", "sort_order");

ALTER TABLE "lms"."course_documents" ADD CONSTRAINT "course_documents_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
