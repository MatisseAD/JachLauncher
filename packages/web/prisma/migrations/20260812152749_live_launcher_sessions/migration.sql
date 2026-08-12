-- Ephemeral desktop presence. Authentication uses a random bearer token whose
-- SHA-256 hash is the only value persisted by the server.
CREATE TABLE "launcher_client_sessions" (
    "id" TEXT NOT NULL,
    "launcher_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_value" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "client_version" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "game_started_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "closed_reason" TEXT,
    "pending_command_id" TEXT,
    "pending_command" TEXT,
    "pending_command_reason" TEXT,
    "pending_command_at" TIMESTAMPTZ(3),
    "pending_command_by_id" TEXT,
    "last_acknowledged_command_id" TEXT,

    CONSTRAINT "launcher_client_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "launcher_client_sessions_launcher_id_fkey"
      FOREIGN KEY ("launcher_id") REFERENCES "Launcher"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "launcher_client_sessions_pending_command_by_id_fkey"
      FOREIGN KEY ("pending_command_by_id") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "launcher_client_sessions_token_hash_check"
      CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "launcher_client_sessions_subject_type_check"
      CHECK ("subject_type" IN ('microsoft_uuid', 'offline_username')),
    CONSTRAINT "launcher_client_sessions_subject_value_check"
      CHECK (length("subject_value") BETWEEN 3 AND 32),
    CONSTRAINT "launcher_client_sessions_username_check"
      CHECK ("username" ~ '^[A-Za-z0-9_]{3,16}$'),
    CONSTRAINT "launcher_client_sessions_version_check"
      CHECK (length(btrim("client_version")) BETWEEN 1 AND 64),
    CONSTRAINT "launcher_client_sessions_state_check"
      CHECK ("state" IN ('open', 'in_game')),
    CONSTRAINT "launcher_client_sessions_expiry_check"
      CHECK ("expires_at" > "last_heartbeat_at"),
    CONSTRAINT "launcher_client_sessions_closed_check"
      CHECK (
        ("closed_at" IS NULL AND "closed_reason" IS NULL)
        OR (
          "closed_at" IS NOT NULL
          AND "closed_reason" IS NOT NULL
          AND length(btrim("closed_reason")) BETWEEN 3 AND 80
        )
      ),
    CONSTRAINT "launcher_client_sessions_command_check"
      CHECK (
        (
          "pending_command_id" IS NULL
          AND "pending_command" IS NULL
          AND "pending_command_reason" IS NULL
          AND "pending_command_at" IS NULL
          AND "pending_command_by_id" IS NULL
        )
        OR (
          "pending_command_id" IS NOT NULL
          AND "pending_command_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          AND "pending_command" IN ('stop_game', 'close_client')
          AND "pending_command_reason" IS NOT NULL
          AND length(btrim("pending_command_reason")) BETWEEN 3 AND 500
          AND "pending_command_at" IS NOT NULL
          AND "pending_command_by_id" IS NOT NULL
        )
      ),
    CONSTRAINT "launcher_client_sessions_acknowledged_command_check"
      CHECK (
        "last_acknowledged_command_id" IS NULL
        OR "last_acknowledged_command_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
);

CREATE UNIQUE INDEX "launcher_client_sessions_token_hash_key"
  ON "launcher_client_sessions"("token_hash");
CREATE INDEX "launcher_client_sessions_launcher_id_idx"
  ON "launcher_client_sessions"("launcher_id");
CREATE INDEX "launcher_client_sessions_pending_command_by_id_idx"
  ON "launcher_client_sessions"("pending_command_by_id");
CREATE INDEX "launcher_client_sessions_identity_idx"
  ON "launcher_client_sessions"("subject_type", "subject_value", "closed_at");
CREATE INDEX "launcher_client_sessions_heartbeat_id_idx"
  ON "launcher_client_sessions"("last_heartbeat_at", "id");
CREATE INDEX "launcher_client_sessions_active_idx"
  ON "launcher_client_sessions"("expires_at" DESC, "last_heartbeat_at" DESC, "id" DESC)
  WHERE "closed_at" IS NULL;
CREATE INDEX "launcher_client_sessions_closed_cleanup_idx"
  ON "launcher_client_sessions"("closed_at", "id")
  WHERE "closed_at" IS NOT NULL;

-- The Data API must never expose presence rows or token hashes. The Next.js
-- server accesses this table only through its direct Prisma connection.
ALTER TABLE "launcher_client_sessions" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "launcher_client_sessions" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "launcher_client_sessions" FROM authenticated';
  END IF;
END;
$$;

-- Session commands are first-class immutable audit targets.
ALTER TABLE "admin_audit_logs"
DROP CONSTRAINT "admin_audit_logs_target_type_check";
ALTER TABLE "admin_audit_logs"
ADD CONSTRAINT "admin_audit_logs_target_type_check"
  CHECK ("target_type" IN ('user', 'launcher', 'player_ban', 'launcher_session', 'system'));
