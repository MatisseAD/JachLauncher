-- Administration roles and reversible account/launcher restrictions.
ALTER TABLE "User"
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN "disabledAt" TIMESTAMPTZ(3),
ADD COLUMN "disabledReason" TEXT,
ADD COLUMN "disabledById" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMPTZ(3);

ALTER TABLE "Launcher"
ADD COLUMN "suspendedAt" TIMESTAMPTZ(3),
ADD COLUMN "suspensionReason" TEXT,
ADD COLUMN "suspendedById" TEXT;

ALTER TABLE "User"
ADD CONSTRAINT "User_role_check"
  CHECK ("role" IN ('user', 'admin')),
ADD CONSTRAINT "User_disabled_reason_check"
  CHECK (
    ("disabledAt" IS NULL AND "disabledReason" IS NULL AND "disabledById" IS NULL)
    OR (
      "disabledAt" IS NOT NULL
      AND "disabledReason" IS NOT NULL
      AND length(btrim("disabledReason")) BETWEEN 3 AND 500
      AND "disabledById" IS NOT NULL
    )
  ),
ADD CONSTRAINT "User_disabledById_fkey"
  FOREIGN KEY ("disabledById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Launcher"
ADD CONSTRAINT "Launcher_suspension_reason_check"
  CHECK (
    ("suspendedAt" IS NULL AND "suspensionReason" IS NULL AND "suspendedById" IS NULL)
    OR (
      "suspendedAt" IS NOT NULL
      AND "suspensionReason" IS NOT NULL
      AND length(btrim("suspensionReason")) BETWEEN 3 AND 500
      AND "suspendedById" IS NOT NULL
    )
  ),
ADD CONSTRAINT "Launcher_suspendedById_fkey"
  FOREIGN KEY ("suspendedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "User_disabledById_idx" ON "User"("disabledById");
CREATE INDEX "User_disabledAt_idx" ON "User"("disabledAt");
CREATE INDEX "User_role_disabledAt_idx" ON "User"("role", "disabledAt");
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");
CREATE INDEX "User_createdAt_id_idx" ON "User"("createdAt", "id");
CREATE INDEX "Launcher_suspendedById_idx" ON "Launcher"("suspendedById");
CREATE INDEX "Launcher_suspendedAt_idx" ON "Launcher"("suspendedAt");
CREATE INDEX "Launcher_createdAt_id_idx" ON "Launcher"("createdAt", "id");

-- Player restrictions are soft-revoked so the security history remains intact.
CREATE TABLE "player_bans" (
    "id" TEXT NOT NULL,
    "launcher_id" TEXT,
    "subject_type" TEXT NOT NULL,
    "subject_value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_by_id" TEXT NOT NULL,
    "revoked_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "player_bans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "player_bans_subject_type_check"
      CHECK ("subject_type" IN ('microsoft_uuid', 'offline_username')),
    CONSTRAINT "player_bans_subject_value_check"
      CHECK (length("subject_value") BETWEEN 3 AND 32),
    CONSTRAINT "player_bans_reason_check"
      CHECK (length(btrim("reason")) BETWEEN 3 AND 500),
    CONSTRAINT "player_bans_expiry_check"
      CHECK ("expires_at" IS NULL OR "expires_at" > "created_at"),
    CONSTRAINT "player_bans_revocation_check"
      CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at"),
    CONSTRAINT "player_bans_launcher_id_fkey"
      FOREIGN KEY ("launcher_id") REFERENCES "Launcher"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "player_bans_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "player_bans_revoked_by_id_fkey"
      FOREIGN KEY ("revoked_by_id") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "player_bans_launcher_id_idx" ON "player_bans"("launcher_id");
CREATE INDEX "player_bans_created_by_id_idx" ON "player_bans"("created_by_id");
CREATE INDEX "player_bans_revoked_by_id_idx" ON "player_bans"("revoked_by_id");
CREATE INDEX "player_bans_access_idx"
  ON "player_bans"("subject_type", "subject_value", "revoked_at", "expires_at");
CREATE INDEX "player_bans_created_at_id_idx" ON "player_bans"("created_at", "id");

CREATE UNIQUE INDEX "player_bans_global_active_key"
  ON "player_bans"("subject_type", "subject_value")
  WHERE "launcher_id" IS NULL AND "revoked_at" IS NULL;
CREATE UNIQUE INDEX "player_bans_launcher_active_key"
  ON "player_bans"("launcher_id", "subject_type", "subject_value")
  WHERE "launcher_id" IS NOT NULL AND "revoked_at" IS NULL;

-- Append-only audit trail. Targets are stored as immutable identifiers rather
-- than foreign keys so deleting a target never erases its administrative trace.
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_audit_logs_action_check"
      CHECK (length("action") BETWEEN 3 AND 80),
    CONSTRAINT "admin_audit_logs_target_type_check"
      CHECK ("target_type" IN ('user', 'launcher', 'player_ban', 'system')),
    CONSTRAINT "admin_audit_logs_actor_id_fkey"
      FOREIGN KEY ("actor_id") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "admin_audit_logs_actor_id_idx" ON "admin_audit_logs"("actor_id");
CREATE INDEX "admin_audit_logs_created_at_id_idx"
  ON "admin_audit_logs"("created_at", "id");
CREATE INDEX "admin_audit_logs_action_created_at_idx"
  ON "admin_audit_logs"("action", "created_at");

CREATE FUNCTION "prevent_admin_audit_log_changes"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs is append-only' USING ERRCODE = '55000';
END;
$$;

REVOKE ALL ON FUNCTION "prevent_admin_audit_log_changes"() FROM PUBLIC;

CREATE TRIGGER "admin_audit_logs_no_update_or_delete"
BEFORE UPDATE OR DELETE ON "admin_audit_logs"
FOR EACH ROW EXECUTE FUNCTION "prevent_admin_audit_log_changes"();

CREATE TRIGGER "admin_audit_logs_no_truncate"
BEFORE TRUNCATE ON "admin_audit_logs"
FOR EACH STATEMENT EXECUTE FUNCTION "prevent_admin_audit_log_changes"();

-- Defense in depth if the current Prisma schema is exposed through Supabase's
-- Data API. No anon/authenticated policy is intentionally created: only the
-- direct Prisma server connection can access rows. RLS is not forced so the
-- table owner used by the backend keeps working.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Launcher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LauncherDailyMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserUploadUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "player_bans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_audit_logs" ENABLE ROW LEVEL SECURITY;
