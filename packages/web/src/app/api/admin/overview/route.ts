import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

const Query = z.object({
  q: z.string().trim().max(64).default(""),
  limit: z.coerce.number().int().min(10).max(100).default(25),
  userCursor: z.string().min(1).max(64).optional(),
  launcherCursor: z.string().min(1).max(64).optional(),
  banCursor: z.string().min(1).max(64).optional(),
  auditCursor: z.string().min(1).max(64).optional(),
});

function page<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const visible = hasMore ? items.slice(0, limit) : items;
  return {
    items: visible,
    nextCursor: hasMore ? (visible.at(-1)?.id ?? null) : null,
  };
}

export async function GET(request: Request) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json(
      { error: "Accès administrateur requis" },
      { status: 403 },
    );
  }
  if (
    !consumeRateLimit(request, `admin-overview:${admin.userId}`, 120, 60_000)
  ) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres invalides" },
      { status: 400 },
    );
  }

  const { q, limit, userCursor, launcherCursor, banCursor, auditCursor } =
    parsed.data;
  const take = limit + 1;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const utcToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const activeBanWhere: Prisma.PlayerBanWhereInput = {
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
  const userWhere: Prisma.UserWhereInput = q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const launcherWhere: Prisma.LauncherWhereInput = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { owner: { username: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const banWhere: Prisma.PlayerBanWhereInput = q
    ? {
        OR: [
          { subjectValue: { contains: q, mode: "insensitive" } },
          { reason: { contains: q, mode: "insensitive" } },
          { launcher: { slug: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const auditWhere: Prisma.AdminAuditLogWhereInput = q
    ? {
        OR: [
          { action: { contains: q, mode: "insensitive" } },
          { targetId: { contains: q, mode: "insensitive" } },
          { actor: { username: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  try {
    const [
      usersTotal,
      usersDisabled,
      usersAdmins,
      usersNew7d,
      usersActive30d,
      launchersTotal,
      launchersPublished,
      launchersReady,
      launchersDraft,
      launchersSuspended,
      launchersNew7d,
      bansActive,
      bansGlobal,
      auditTotal,
      uploadsToday,
      users,
      launchers,
      playerBans,
      audit,
    ] = await prisma.$transaction(
      [
        prisma.user.count(),
        prisma.user.count({ where: { disabledAt: { not: null } } }),
        prisma.user.count({ where: { role: "admin" } }),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.user.count({
          where: { lastLoginAt: { gte: thirtyDaysAgo }, disabledAt: null },
        }),
        prisma.launcher.count(),
        prisma.launcher.count({ where: { status: "published" } }),
        prisma.launcher.count({ where: { status: "ready" } }),
        prisma.launcher.count({ where: { status: "draft" } }),
        prisma.launcher.count({ where: { suspendedAt: { not: null } } }),
        prisma.launcher.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.playerBan.count({ where: activeBanWhere }),
        prisma.playerBan.count({
          where: { AND: [activeBanWhere, { launcherId: null }] },
        }),
        prisma.adminAuditLog.count(),
        prisma.userUploadUsage.aggregate({
          where: { day: utcToday },
          _sum: { bytes: true, uploads: true },
        }),
        prisma.user.findMany({
          where: userWhere,
          take,
          ...(userCursor ? { cursor: { id: userCursor }, skip: 1 } : {}),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            role: true,
            disabledAt: true,
            disabledReason: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { launchers: true } },
          },
        }),
        prisma.launcher.findMany({
          where: launcherWhere,
          take,
          ...(launcherCursor
            ? { cursor: { id: launcherCursor }, skip: 1 }
            : {}),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            suspendedAt: true,
            suspensionReason: true,
            createdAt: true,
            updatedAt: true,
            owner: { select: { id: true, username: true, disabledAt: true } },
          },
        }),
        prisma.playerBan.findMany({
          where: banWhere,
          take,
          ...(banCursor ? { cursor: { id: banCursor }, skip: 1 } : {}),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            launcherId: true,
            launcher: { select: { id: true, slug: true, title: true } },
            subjectType: true,
            subjectValue: true,
            reason: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
            createdBy: { select: { id: true, username: true } },
          },
        }),
        prisma.adminAuditLog.findMany({
          where: auditWhere,
          take,
          ...(auditCursor ? { cursor: { id: auditCursor }, skip: 1 } : {}),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            action: true,
            targetType: true,
            targetId: true,
            metadata: true,
            createdAt: true,
            actor: { select: { id: true, username: true } },
          },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const playerBanPage = page(playerBans, limit);
    return NextResponse.json(
      {
        generatedAt: now.toISOString(),
        metrics: {
          users: {
            total: usersTotal,
            active: usersTotal - usersDisabled,
            disabled: usersDisabled,
            admins: usersAdmins,
            new7d: usersNew7d,
            active30d: usersActive30d,
          },
          launchers: {
            total: launchersTotal,
            published: launchersPublished,
            ready: launchersReady,
            draft: launchersDraft,
            suspended: launchersSuspended,
            new7d: launchersNew7d,
          },
          playerBans: { active: bansActive, global: bansGlobal },
          uploadsToday: {
            bytes: uploadsToday._sum.bytes ?? 0,
            uploads: uploadsToday._sum.uploads ?? 0,
          },
          audit: { total: auditTotal },
        },
        users: page(users, limit),
        launchers: page(launchers, limit),
        playerBans: {
          ...playerBanPage,
          items: playerBanPage.items.map((ban) => ({
            ...ban,
            scope: ban.launcherId ? "launcher" : "global",
          })),
        },
        audit: page(audit, limit),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin overview failed", error);
    return NextResponse.json(
      { error: "Impossible de charger l'administration" },
      { status: 500 },
    );
  }
}
