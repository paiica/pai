-- CreateTable
CREATE TABLE "lms"."admin_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tabs" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_user_id_key" ON "lms"."admin_permissions"("user_id");

-- AddForeignKey
ALTER TABLE "lms"."admin_permissions" ADD CONSTRAINT "admin_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
