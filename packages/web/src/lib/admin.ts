import type { Prisma } from "@prisma/client";
import { getSession } from "./auth";
import { prisma } from "./db";
import { isActiveAdminRecord, isSameOriginRequest } from "./admin-policy";

export interface AdminContext {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: "admin";
}

/**
 * Revalidates the role and account state in PostgreSQL on every call. The JWT
 * is deliberately not an authorization source, so promotion, demotion or ban
 * changes take effect immediately without waiting for token refresh.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.userId, role: "admin", disabledAt: null },
    select: { id: true, username: true, avatarUrl: true, role: true },
  });
  if (!user || user.role !== "admin") return null;
  return {
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: "admin",
  };
}

export function isAllowedAdminMutationOrigin(request: Request): boolean {
  return isSameOriginRequest(
    request.url,
    request.headers.get("origin"),
    process.env.NEXT_PUBLIC_APP_URL,
  );
}

export interface AuditInput {
  actorId: string | null;
  action: string;
  targetType: "user" | "launcher" | "player_ban" | "system";
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export class AdminAuthorizationChangedError extends Error {
  readonly code = "ADMIN_AUTHORIZATION_CHANGED";

  constructor() {
    super("Tes droits administrateur ont changé. Recharge la page.");
    this.name = "AdminAuthorizationChangedError";
  }
}

/**
 * Must be the first lock acquired by every admin mutation. Locking all current
 * admins in ID order serializes authority changes and prevents a stale context
 * from performing a write after demotion or suspension.
 */
export async function lockAndRevalidateAdmin(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<AdminContext> {
  await tx.$queryRaw`
    SELECT "id" FROM "User"
    WHERE "role" = 'admin'
    ORDER BY "id"
    FOR UPDATE
  `;
  const actor = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      role: true,
      disabledAt: true,
    },
  });
  if (!actor || !isActiveAdminRecord(actor.role, actor.disabledAt)) {
    throw new AdminAuthorizationChangedError();
  }
  return {
    userId: actor.id,
    username: actor.username,
    avatarUrl: actor.avatarUrl,
    role: "admin",
  };
}

/** Must be invoked inside the same short transaction as the protected write. */
export async function appendAdminAudit(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
  });
}
