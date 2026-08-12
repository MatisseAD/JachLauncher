import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/db";
import {
  hashPresenceToken,
  policyCommand,
  presenceExpiry,
  PresenceCloseSchema,
  PresenceHeartbeatSchema,
  readPresenceBearer,
} from "../../../../lib/launcher-presence";
import { consumeRateLimit } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = presenceCorsHeaders();
  const token = readPresenceBearer(request);
  if (!token) return unauthorized(headers);
  const tokenHash = hashPresenceToken(token);
  if (
    !consumeRateLimit(
      request,
      `presence-heartbeat:${tokenHash.slice(0, 16)}`,
      60,
      60_000,
    )
  ) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Heartbeat trop fréquent." },
      { status: 429, headers },
    );
  }
  const parsed = PresenceHeartbeatSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", message: "Heartbeat invalide." },
      { status: 400, headers },
    );
  }

  const now = new Date();
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "launcher_client_sessions"
          WHERE "token_hash" = ${tokenHash}
          FOR UPDATE
        `;
        const session = await tx.launcherClientSession.findUnique({
          where: { tokenHash },
          include: {
            launcher: {
              select: {
                status: true,
                suspendedAt: true,
                owner: { select: { disabledAt: true } },
              },
            },
          },
        });
        if (!session || session.closedAt) return { unauthorized: true };
        if (session.expiresAt <= now) {
          await tx.launcherClientSession.update({
            where: { id: session.id },
            data: { closedAt: now, closedReason: "heartbeat_expired" },
          });
          return { unauthorized: true };
        }

        const acknowledged =
          parsed.data.acknowledgedCommandId &&
          parsed.data.acknowledgedCommandId === session.pendingCommandId;
        const ban = await tx.playerBan.findFirst({
          where: {
            subjectType: session.subjectType,
            subjectValue: session.subjectValue,
            revokedAt: null,
            AND: [
              { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              {
                OR: [{ launcherId: null }, { launcherId: session.launcherId }],
              },
            ],
          },
          select: { id: true },
        });
        const automaticCommand = policyCommand({
          launcherPublished: session.launcher.status === "published",
          launcherSuspended: session.launcher.suspendedAt !== null,
          ownerDisabled: session.launcher.owner.disabledAt !== null,
          playerBanned: ban !== null,
        });
        const explicitCommand =
          !acknowledged && session.pendingCommand && session.pendingCommandId
            ? {
                id: session.pendingCommandId,
                action: session.pendingCommand as "stop_game" | "close_client",
                reason:
                  session.pendingCommandReason ??
                  "Action demandée par un administrateur.",
                source: "admin" as const,
              }
            : null;

        await tx.launcherClientSession.update({
          where: { id: session.id },
          data: {
            state: parsed.data.state,
            clientVersion: parsed.data.clientVersion,
            lastHeartbeatAt: now,
            expiresAt: presenceExpiry(now),
            gameStartedAt:
              parsed.data.state === "in_game"
                ? (session.gameStartedAt ?? now)
                : null,
            ...(acknowledged
              ? {
                  lastAcknowledgedCommandId: session.pendingCommandId,
                  pendingCommandId: null,
                  pendingCommand: null,
                  pendingCommandReason: null,
                  pendingCommandAt: null,
                  pendingCommandById: null,
                }
              : {}),
          },
        });

        return {
          unauthorized: false,
          command: automaticCommand
            ? {
                id: null,
                action: automaticCommand.action,
                reason: automaticCommand.reason,
                code: automaticCommand.code,
                source: "policy" as const,
              }
            : explicitCommand,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    if (result.unauthorized) return unauthorized(headers);
    return NextResponse.json(
      {
        ok: true,
        nextHeartbeatInSeconds: 15,
        command: result.command ?? null,
      },
      { headers },
    );
  } catch (error) {
    console.error("Launcher presence heartbeat failed", error);
    return NextResponse.json(
      {
        ok: false,
        code: "PRESENCE_UNAVAILABLE",
        message: "Le service de présence est temporairement indisponible.",
      },
      { status: 503, headers },
    );
  }
}

export async function DELETE(request: Request) {
  const headers = presenceCorsHeaders();
  const token = readPresenceBearer(request);
  if (!token) return unauthorized(headers);
  const tokenHash = hashPresenceToken(token);
  if (
    !consumeRateLimit(
      request,
      `presence-close:${tokenHash.slice(0, 16)}`,
      20,
      60_000,
    )
  ) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Trop de requêtes." },
      { status: 429, headers },
    );
  }
  const parsed = PresenceCloseSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", message: "Fermeture invalide." },
      { status: 400, headers },
    );
  }
  const now = new Date();
  try {
    await prisma.launcherClientSession.updateMany({
      where: { tokenHash, closedAt: null },
      data: {
        closedAt: now,
        closedReason: parsed.data.reason,
        ...(parsed.data.acknowledgedCommandId
          ? {
              lastAcknowledgedCommandId: parsed.data.acknowledgedCommandId,
            }
          : {}),
      },
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    console.error("Launcher presence close failed", error);
    return NextResponse.json(
      { ok: false, code: "PRESENCE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: presenceCorsHeaders(),
  });
}

function unauthorized(headers: Record<string, string>) {
  return NextResponse.json(
    { ok: false, code: "SESSION_EXPIRED", message: "Session expirée." },
    { status: 401, headers },
  );
}

function presenceCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Accept, Authorization, Content-Type, X-YourLauncher-Client",
    "Cache-Control": "no-store",
  };
}
