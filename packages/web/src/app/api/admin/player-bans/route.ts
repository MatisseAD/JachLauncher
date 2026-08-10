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
  InvalidPlayerIdentityError,
  normalizePlayerIdentity,
  PLAYER_SUBJECT_TYPES,
} from "@/lib/admin-policy";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

const Body = z
  .object({
    launcherId: z.string().min(1).max(64).nullable().optional(),
    subjectType: z.enum(PLAYER_SUBJECT_TYPES),
    subjectValue: z.string().trim().min(1).max(64),
    reason: z.string().trim().min(3).max(500),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict();

class MutationError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
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

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  let subjectValue: string;
  try {
    subjectValue = normalizePlayerIdentity(
      parsed.data.subjectType,
      parsed.data.subjectValue,
    );
  } catch (error) {
    if (error instanceof InvalidPlayerIdentityError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const launcherId = parsed.data.launcherId ?? null;
  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "La date d'expiration doit être future" },
      { status: 400 },
    );
  }

  try {
    const playerBan = await prisma.$transaction(
      async (tx) => {
        const lockedAdmin = await lockAndRevalidateAdmin(tx, admin.userId);
        let launcher: { id: string; slug: string } | null = null;
        if (launcherId) {
          await tx.$queryRaw`
            SELECT "id" FROM "Launcher"
            WHERE "id" = ${launcherId}
            FOR UPDATE
          `;
          launcher = await tx.launcher.findUnique({
            where: { id: launcherId },
            select: { id: true, slug: true },
          });
          if (!launcher) throw new MutationError(404, "Launcher introuvable");
        }

        const now = new Date();
        const existing = await tx.playerBan.findFirst({
          where: {
            launcherId,
            subjectType: parsed.data.subjectType,
            subjectValue,
            revokedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });
        if (existing && (!existing.expiresAt || existing.expiresAt > now)) {
          throw new MutationError(
            409,
            "Ce joueur est déjà bloqué dans ce périmètre",
          );
        }
        if (existing) {
          await tx.playerBan.update({
            where: { id: existing.id },
            data: {
              revokedAt: now,
              revokedBy: { connect: { id: lockedAdmin.userId } },
            },
          });
        }

        const created = await tx.playerBan.create({
          data: {
            launcherId,
            subjectType: parsed.data.subjectType,
            subjectValue,
            reason: parsed.data.reason,
            expiresAt,
            createdById: lockedAdmin.userId,
          },
          select: {
            id: true,
            launcherId: true,
            subjectType: true,
            subjectValue: true,
            reason: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
          },
        });
        await appendAdminAudit(tx, {
          actorId: lockedAdmin.userId,
          action: "player_ban.create",
          targetType: "player_ban",
          targetId: created.id,
          metadata: {
            scope: launcher ? "launcher" : "global",
            launcherId,
            launcherSlug: launcher?.slug ?? null,
            subjectType: created.subjectType,
            subjectValue: created.subjectValue,
            reason: created.reason,
            expiresAt: created.expiresAt?.toISOString() ?? null,
            replacedExpiredBanId: existing?.id ?? null,
          },
        });
        return created;
      },
      { maxWait: 5_000, timeout: 5_000 },
    );
    return NextResponse.json({ ok: true, playerBan }, { status: 201 });
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ce joueur est déjà bloqué dans ce périmètre" },
        { status: 409 },
      );
    }
    console.error("Player ban creation failed", error);
    return NextResponse.json({ error: "Blocage impossible" }, { status: 500 });
  }
}
