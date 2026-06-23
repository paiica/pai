-- CreateTable
CREATE TABLE "lms"."page_blocks" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_blocks_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "lms"."nav_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "open_new_tab" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nav_items_parent_id_idx" ON "lms"."nav_items"("parent_id");

-- AddForeignKey
ALTER TABLE "lms"."nav_items" ADD CONSTRAINT "nav_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "lms"."nav_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
