import { NextResponse } from "next/server";
import { SafeSlugSchema } from "@jach/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/db";
import { isDemoSlug } from "../../../../lib/demo-slugs";
import { launcherAccessIdentity } from "../../../../lib/launcher-access-contract";
import {
  createPresenceToken,
  hashPresenceToken,
  PRESENCE_HEARTBEAT_INTERVAL_SECONDS,
  presenceExpiry,
  PresenceOpenSchema,
} from "../../../../lib/launcher-presence";
import { cleanupLauncherPresence } from "../../../../lib/launcher-presence-server";
import { consumeRateLimit } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const headers = presenceCorsHeaders();
  if (!consumeRateLimit(request, "presence-open", 60, 10 * 60_000)) {
    return failure("RATE_LIMITED", "Trop de connexions rapprochées.", 429);
  }

  const parsedSlug = SafeSlugSchema.safeParse((await params).slug);
  const parsed = PresenceOpenSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedSlug.success || !parsed.success) {
    return failure("INVALID_REQUEST", "Session launcher invalide.", 400);
  }
  if (isDemoSlug(parsedSlug.data)) {
    return failure(
      "PRESENCE_UNAVAILABLE",
      "La présence distante n'est pas disponible pour les démonstrations.",
      404,
    );
  }

  const { subjectType, subjectValue } = launcherAccessIdentity(
    parsed.data.account,
  );
  const token = createPresenceToken();
  const tokenHash = hashPresenceToken(token);
  const now = new Date();

  try {
    await cleanupLauncherPresence(now);
    const result = await prisma.$transaction(
      async (tx) => {
        const launcher = await tx.launcher.findUnique({
          where: { slug: parsedSlug.data },
          select: {
            id: true,
            status: true,
            suspendedAt: true,
            owner: { select: { disabledAt: true } },
          },
        });
        if (!launcher || launcher.status !== "published") {
          return { denied: "LAUNCHER_UNAVAILABLE" as const };
        }
        if (launcher.suspendedAt) {
          return { denied: "LAUNCHER_SUSPENDED" as const };
        }
        if (launcher.owner.disabledAt) {
          return { denied: "OWNER_DISABLED" as const };
        }
        const ban = await tx.playerBan.findFirst({
          where: {
            subjectType,
            subjectValue,
            revokedAt: null,
            AND: [
              { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              { OR: [{ launcherId: null }, { launcherId: launcher.id }] },
            ],
          },
          select: { id: true },
        });
        if (ban) return { denied: "PLAYER_BANNED" as const };

        const session = await tx.launcherClientSession.create({
          data: {
            launcherId: launcher.id,
            tokenHash,
            subjectType,
            subjectValue,
            username: parsed.data.account.username,
            clientVersion: parsed.data.clientVersion,
            expiresAt: presenceExpiry(now),
          },
          select: { id: true, expiresAt: true },
        });
        return { session };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if ("denied" in result && result.denied) {
      const messages = {
        LAUNCHER_UNAVAILABLE: "Ce launcher n'est pas disponible.",
        LAUNCHER_SUSPENDED: "Ce launcher est suspendu.",
        OWNER_DISABLED: "Le propriétaire de ce launcher est désactivé.",
        PLAYER_BANNED: "Cette identité est interdite sur ce launcher.",
      } as const;
      return failure(result.denied, messages[result.denied], 403);
    }

    return NextResponse.json(
      {
        sessionId: result.session.id,
        token,
        expiresAt: result.session.expiresAt.toISOString(),
        heartbeatIntervalSeconds: PRESENCE_HEARTBEAT_INTERVAL_SECONDS,
      },
      { status: 201, headers },
    );
  } catch (error) {
    console.error("Launcher presence open failed", {
      slug: parsedSlug.data,
      error,
    });
    return failure(
      "PRESENCE_UNAVAILABLE",
      "La présence distante est temporairement indisponible.",
      503,
    );
  }

  function failure(code: string, message: string, status: number) {
    return NextResponse.json({ ok: false, code, message }, { status, headers });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: presenceCorsHeaders(),
  });
}

function presenceCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Accept, Authorization, Content-Type, X-YourLauncher-Client",
    "Cache-Control": "no-store",
  };
}
