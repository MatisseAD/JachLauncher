import { randomUUID } from "node:crypto";
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
import { prisma } from "@/lib/db";
import { AdminPresenceCommandSchema } from "@/lib/launcher-presence";
import { consumeRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

class CommandError extends Error {
  constructor(
    readonly status: number,
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
  if (
    !consumeRateLimit(request, `admin-live-command:${admin.userId}`, 30, 60_000)
  ) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const { id } = await params;
  if (!z.string().min(1).max(64).safeParse(id).success) {
    return NextResponse.json(
      { error: "Identifiant invalide" },
      { status: 400 },
    );
  }
  const parsed = AdminPresenceCommandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Commande ou motif invalide" },
      { status: 400 },
    );
  }

  try {
    const command = await prisma.$transaction(
      async (tx) => {
        const lockedAdmin = await lockAndRevalidateAdmin(tx, admin.userId);
        await tx.$queryRaw`
          SELECT "id" FROM "launcher_client_sessions"
          WHERE "id" = ${id}
          FOR UPDATE
        `;
        const session = await tx.launcherClientSession.findUnique({
          where: { id },
          select: {
            id: true,
            launcherId: true,
            username: true,
            subjectType: true,
            subjectValue: true,
            state: true,
            closedAt: true,
            expiresAt: true,
            pendingCommandId: true,
          },
        });
        if (!session) throw new CommandError(404, "Client introuvable");
        if (session.closedAt || session.expiresAt <= new Date()) {
          throw new CommandError(409, "Ce client n'est plus connecté");
        }
        if (session.pendingCommandId) {
          throw new CommandError(
            409,
            "Une commande attend déjà le prochain heartbeat",
          );
        }

        const commandId = randomUUID();
        const requestedAt = new Date();
        await tx.launcherClientSession.update({
          where: { id },
          data: {
            pendingCommandId: commandId,
            pendingCommand: parsed.data.action,
            pendingCommandReason: parsed.data.reason,
            pendingCommandAt: requestedAt,
            pendingCommandById: lockedAdmin.userId,
          },
        });
        await appendAdminAudit(tx, {
          actorId: lockedAdmin.userId,
          action: `launcher_session.${parsed.data.action}`,
          targetType: "launcher_session",
          targetId: session.id,
          metadata: {
            commandId,
            launcherId: session.launcherId,
            username: session.username,
            subjectType: session.subjectType,
            subjectValue: session.subjectValue,
            state: session.state,
            reason: parsed.data.reason,
          },
        });
        return {
          id: commandId,
          action: parsed.data.action,
          requestedAt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 5_000,
      },
    );
    return NextResponse.json({ ok: true, command });
  } catch (error) {
    if (error instanceof CommandError) {
      return NextResponse.json(
        { error: error.message },
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
        { error: "Conflit concurrent, réessaie" },
        { status: 409 },
      );
    }
    console.error("Admin live command failed", error);
    return NextResponse.json({ error: "Commande impossible" }, { status: 500 });
  }
}
