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
import { consumeRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("suspend"),
      reason: z.string().trim().min(3).max(500),
    })
    .strict(),
  z.object({ action: z.literal("restore") }).strict(),
]);

class MutationError extends Error {
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
    !consumeRateLimit(request, `admin-launcher:${admin.userId}`, 30, 60_000)
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
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  try {
    const launcher = await prisma.$transaction(
      async (tx) => {
        const lockedAdmin = await lockAndRevalidateAdmin(tx, admin.userId);
        await tx.$queryRaw`
          SELECT "id" FROM "Launcher"
          WHERE "id" = ${id}
          FOR UPDATE
        `;
        const current = await tx.launcher.findUnique({
          where: { id },
          select: {
            id: true,
            slug: true,
            title: true,
            suspendedAt: true,
          },
        });
        if (!current) throw new MutationError(404, "Launcher introuvable");
        if (parsed.data.action === "suspend" && current.suspendedAt) {
          throw new MutationError(409, "Ce launcher est déjà suspendu");
        }
        if (parsed.data.action === "restore" && !current.suspendedAt) {
          throw new MutationError(409, "Ce launcher est déjà actif");
        }

        const updated = await tx.launcher.update({
          where: { id },
          data:
            parsed.data.action === "suspend"
              ? {
                  suspendedAt: new Date(),
                  suspensionReason: parsed.data.reason,
                  suspendedBy: { connect: { id: lockedAdmin.userId } },
                }
              : {
                  suspendedAt: null,
                  suspensionReason: null,
                  suspendedBy: { disconnect: true },
                },
          select: {
            id: true,
            slug: true,
            title: true,
            suspendedAt: true,
            suspensionReason: true,
          },
        });
        await appendAdminAudit(tx, {
          actorId: lockedAdmin.userId,
          action: `launcher.${parsed.data.action}`,
          targetType: "launcher",
          targetId: current.id,
          metadata: {
            slug: current.slug,
            title: current.title,
            ...(parsed.data.action === "suspend"
              ? { reason: parsed.data.reason }
              : {}),
          },
        });
        return updated;
      },
      { maxWait: 5_000, timeout: 5_000 },
    );
    return NextResponse.json({ ok: true, launcher });
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
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Conflit concurrent, réessaie" },
        { status: 409 },
      );
    }
    console.error("Admin launcher mutation failed", error);
    return NextResponse.json({ error: "Action impossible" }, { status: 500 });
  }
}
