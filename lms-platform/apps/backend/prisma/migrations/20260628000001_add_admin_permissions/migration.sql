-- CreateTable: admin_permissions
-- Stores which admin panel tabs each "admin" role user is allowed to access.
-- super_admin users always have full access and do not need an entry here.

CREATE TABLE IF NOT EXISTS "lms"."admin_permissions" (
    "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"    TEXT        NOT NULL,
    "tabs"       TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_permissions_user_id_key"
    ON "lms"."admin_permissions"("user_id");

-- AddForeignKey
ALTER TABLE "lms"."admin_permissions"
    ADD CONSTRAINT "admin_permissions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "lms"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
