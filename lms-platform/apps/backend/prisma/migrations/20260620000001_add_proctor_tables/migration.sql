-- CreateTable: proctor_events
CREATE TABLE IF NOT EXISTS "lms"."proctor_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" TEXT NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "detail" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "proctor_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "proctor_events_attempt_id_fkey" FOREIGN KEY ("attempt_id")
        REFERENCES "lms"."exam_attempts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "proctor_events_attempt_id_idx" ON "lms"."proctor_events"("attempt_id");

-- CreateTable: proctor_snapshots
CREATE TABLE IF NOT EXISTS "lms"."proctor_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" TEXT NOT NULL,
    "snapshot_url" TEXT NOT NULL,
    "face_detected" BOOLEAN,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "proctor_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "proctor_snapshots_attempt_id_fkey" FOREIGN KEY ("attempt_id")
        REFERENCES "lms"."exam_attempts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "proctor_snapshots_attempt_id_idx" ON "lms"."proctor_snapshots"("attempt_id");
