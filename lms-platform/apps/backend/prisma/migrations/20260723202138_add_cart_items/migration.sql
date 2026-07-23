-- CreateTable
CREATE TABLE "lms"."cart_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "course_id" TEXT,
    "certification_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_items_user_id_idx" ON "lms"."cart_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_id_course_id_key" ON "lms"."cart_items"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_id_certification_id_key" ON "lms"."cart_items"("user_id", "certification_id");

-- AddForeignKey
ALTER TABLE "lms"."cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."cart_items" ADD CONSTRAINT "cart_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "lms"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms"."cart_items" ADD CONSTRAINT "cart_items_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "lms"."certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
