import { prisma } from "./db";
import { PRESENCE_HISTORY_RETENTION_MS } from "./launcher-presence";

/**
 * Opportunistic bounded cleanup. Active rows are marked closed as soon as they
 * expire; closed history is retained for seven days, then removed.
 */
export async function cleanupLauncherPresence(now = new Date()): Promise<void> {
  const retentionCutoff = new Date(
    now.getTime() - PRESENCE_HISTORY_RETENTION_MS,
  );
  // SKIP LOCKED keeps cleanup from waiting on a concurrent heartbeat/command;
  // LIMIT prevents a cold request from deleting an unbounded history at once.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      WITH expired AS (
        SELECT "id" FROM "launcher_client_sessions"
        WHERE "closed_at" IS NULL AND "expires_at" <= ${now}
        ORDER BY "expires_at", "id"
        LIMIT 500
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "launcher_client_sessions" AS sessions
      SET "closed_at" = ${now}, "closed_reason" = 'heartbeat_expired'
      FROM expired
      WHERE sessions."id" = expired."id"
    `;
    await tx.$executeRaw`
      DELETE FROM "launcher_client_sessions"
      WHERE "id" IN (
        SELECT "id" FROM "launcher_client_sessions"
        WHERE "closed_at" < ${retentionCutoff}
        ORDER BY "closed_at", "id"
        LIMIT 500
        FOR UPDATE SKIP LOCKED
      )
    `;
  });
}
