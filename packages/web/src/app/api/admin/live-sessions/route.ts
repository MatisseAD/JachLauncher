import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { cleanupLauncherPresence } from "@/lib/launcher-presence-server";
import { consumeRateLimit } from "@/lib/rate-limit";

const Query = z.object({
  q: z.string().trim().max(64).default(""),
  limit: z.coerce.number().int().min(10).max(200).default(100),
});

export async function GET(request: Request) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json(
      { error: "Accès administrateur requis" },
      { status: 403 },
    );
  }
  if (!consumeRateLimit(request, `admin-live:${admin.userId}`, 120, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }
  const parsed = Query.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres invalides" },
      { status: 400 },
    );
  }

  const now = new Date();
  const activeWhere = { closedAt: null, expiresAt: { gt: now } } as const;
  const searchWhere = parsed.data.q
    ? {
        OR: [
          {
            username: { contains: parsed.data.q, mode: "insensitive" as const },
          },
          {
            subjectValue: {
              contains: parsed.data.q,
              mode: "insensitive" as const,
            },
          },
          {
            clientVersion: {
              contains: parsed.data.q,
              mode: "insensitive" as const,
            },
          },
          {
            launcher: {
              OR: [
                {
                  slug: {
                    contains: parsed.data.q,
                    mode: "insensitive" as const,
                  },
                },
                {
                  title: {
                    contains: parsed.data.q,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        ],
      }
    : {};

  try {
    await cleanupLauncherPresence(now);
    const [total, inGame, filteredTotal, sessions] = await prisma.$transaction([
      prisma.launcherClientSession.count({ where: activeWhere }),
      prisma.launcherClientSession.count({
        where: { ...activeWhere, state: "in_game" },
      }),
      prisma.launcherClientSession.count({
        where: { AND: [activeWhere, searchWhere] },
      }),
      prisma.launcherClientSession.findMany({
        where: { AND: [activeWhere, searchWhere] },
        take: parsed.data.limit,
        orderBy: [{ lastHeartbeatAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          subjectType: true,
          subjectValue: true,
          username: true,
          clientVersion: true,
          state: true,
          openedAt: true,
          lastHeartbeatAt: true,
          expiresAt: true,
          gameStartedAt: true,
          pendingCommandId: true,
          pendingCommand: true,
          pendingCommandReason: true,
          pendingCommandAt: true,
          launcher: { select: { id: true, slug: true, title: true } },
        },
      }),
    ]);

    return NextResponse.json(
      {
        generatedAt: now.toISOString(),
        refreshAfterSeconds: 10,
        metrics: { total, inGame, launcherOpen: total - inGame },
        truncated: filteredTotal > sessions.length,
        sessions,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin live sessions failed", error);
    return NextResponse.json(
      { error: "Impossible de charger les clients actifs" },
      { status: 500 },
    );
  }
}
