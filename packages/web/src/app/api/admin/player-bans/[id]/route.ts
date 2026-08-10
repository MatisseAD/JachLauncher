import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AdminAuthorizationChangedError,
  appendAdminAudit,
  getAdminContext,
  isAllowedAdminMutationOrigin,
  lockAndRevalidateAdmin,
} from "@/lib/admin";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

class MutationError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
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
    !consumeRateLimit(request, `admin-player-ban:${admin.userId}`, 30, 60_000)
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

  try {
    const playerBan = await prisma.$transaction(
      async (tx) => {
        const lockedAdmin = await lockAndRevalidateAdmin(tx, admin.userId);
        await tx.$queryRaw`
          SELECT "id" FROM "player_bans"
          WHERE "id" = ${id}
          FOR UPDATE
        `;
        const current = await tx.playerBan.findUnique({ where: { id } });
        if (!current) throw new MutationError(404, "Blocage introuvable");
        if (current.revokedAt) {
          throw new MutationError(409, "Ce blocage est déjà révoqué");
        }
        const revoked = await tx.playerBan.update({
          where: { id },
          data: {
            revokedAt: new Date(),
            revokedBy: { connect: { id: lockedAdmin.userId } },
          },
          select: { id: true, revokedAt: true },
        });
        await appendAdminAudit(tx, {
          actorId: lockedAdmin.userId,
          action: "player_ban.revoke",
          targetType: "player_ban",
          targetId: current.id,
          metadata: {
            launcherId: current.launcherId,
            subjectType: current.subjectType,
            subjectValue: current.subjectValue,
          },
        });
        return revoked;
      },
      { maxWait: 5_000, timeout: 5_000 },
    );
    return NextResponse.json({ ok: true, playerBan });
  } catch (error) {
    if (error instanceof MutationError) {
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
    console.error("Player ban revocation failed", error);
    return NextResponse.json(
      { error: "Révocation impossible" },
      { status: 500 },
    );
  }
}
