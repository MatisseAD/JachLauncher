import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  AdminAuthorizationChangedError,
  appendAdminAudit,
  getAdminContext,
  isAllowedAdminMutationOrigin,
  lockAndRevalidateAdmin,
} from "@/lib/admin";
import {
  evaluateUserAdminAction,
  type UserAdminAction,
  type UserRole,
} from "@/lib/admin-policy";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("ban"),
      reason: z.string().trim().min(3).max(500),
    })
    .strict(),
  z.object({ action: z.literal("unban") }).strict(),
  z.object({ action: z.literal("promote") }).strict(),
  z.object({ action: z.literal("demote") }).strict(),
]);

const DENIAL_MESSAGES = {
  SELF_ACTION: "Tu ne peux pas appliquer cette action à ton propre compte",
  ALREADY_DISABLED: "Ce compte est déjà suspendu",
  ALREADY_ACTIVE: "Ce compte est déjà actif",
  ALREADY_ADMIN: "Ce compte est déjà administrateur",
  ALREADY_USER: "Ce compte n'est pas administrateur",
  LAST_ACTIVE_ADMIN:
    "Le dernier administrateur actif ne peut pas être suspendu",
  LAST_ADMIN: "Le dernier administrateur ne peut pas être rétrogradé",
} as const;

class MutationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!isAllowedAdminMutationOrigin(request)) {
    return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  }
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json(
      { error: "Accès administrateur requis" },
      { status: 403 },
    );
  }
  if (!consumeRateLimit(request, `admin-user:${admin.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const { id } = await params;
  if (!z.string().min(1).max(64).safeParse(id).success) {
    return NextResponse.json(
      { error: "Identifiant invalide" },
      { status: 400 },
    );
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        // Every account-control transaction acquires admin rows in the same
        // order. Combined with SERIALIZABLE, two concurrent demotions cannot
        // both observe themselves as preserving a final administrator.
        const lockedAdmin = await lockAndRevalidateAdmin(tx, admin.userId);
        await tx.$queryRaw`
          SELECT "id" FROM "User"
          WHERE "id" = ${id}
          FOR UPDATE
        `;

        const target = await tx.user.findUnique({
          where: { id },
          select: {
            id: true,
            username: true,
            role: true,
            disabledAt: true,
          },
        });
        if (!target)
          throw new MutationError(404, "NOT_FOUND", "Compte introuvable");

        const [activeAdminCount, adminCount] = await Promise.all([
          tx.user.count({ where: { role: "admin", disabledAt: null } }),
          tx.user.count({ where: { role: "admin" } }),
        ]);
        const decision = evaluateUserAdminAction({
          action: parsed.data.action,
          actorId: lockedAdmin.userId,
          targetId: target.id,
          targetRole: target.role as UserRole,
          targetDisabled: target.disabledAt !== null,
          activeAdminCount,
          adminCount,
        });
        if (!decision.allowed) {
          throw new MutationError(
            409,
            decision.reason,
            DENIAL_MESSAGES[decision.reason],
          );
        }

        const data = userActionData(
          parsed.data.action,
          lockedAdmin.userId,
          parsed.data,
        );
        const user = await tx.user.update({
          where: { id: target.id },
          data,
          select: {
            id: true,
            username: true,
            role: true,
            disabledAt: true,
            disabledReason: true,
          },
        });
        await appendAdminAudit(tx, {
          actorId: lockedAdmin.userId,
          action: `user.${parsed.data.action}`,
          targetType: "user",
          targetId: target.id,
          metadata: {
            username: target.username,
            previousRole: target.role,
            nextRole: user.role,
            ...(parsed.data.action === "ban"
              ? { reason: parsed.data.reason }
              : {}),
          },
        });
        return user;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 5_000,
      },
    );
    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof MutationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    if (error instanceof AdminAuthorizationChangedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 403 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Conflit concurrent, réessaie", code: "CONCURRENT_UPDATE" },
        { status: 409 },
      );
    }
    console.error("Admin user mutation failed", error);
    return NextResponse.json({ error: "Action impossible" }, { status: 500 });
  }
}

function userActionData(
  action: UserAdminAction,
  actorId: string,
  body: z.infer<typeof Body>,
): Prisma.UserUpdateInput {
  switch (action) {
    case "ban":
      return {
        disabledAt: new Date(),
        disabledReason: body.action === "ban" ? body.reason : "",
        disabledBy: { connect: { id: actorId } },
      };
    case "unban":
      return {
        disabledAt: null,
        disabledReason: null,
        disabledBy: { disconnect: true },
      };
    case "promote":
      return { role: "admin" };
    case "demote":
      return { role: "user" };
  }
}
