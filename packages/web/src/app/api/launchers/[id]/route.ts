import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { LauncherUpdateSchema } from "@/lib/validation";
import { rowToForm, toUpdateData } from "@/lib/launcher-data";
import { deleteUpload, deleteUploadNamespace } from "@/lib/storage";
import {
  isLauncherSuspended,
  SUSPENDED_LAUNCHER_OWNER_ERROR,
} from "@/lib/launcher-suspension";

type Ctx = { params: Promise<{ id: string }> };

class LauncherOwnerMutationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function ownLauncherOr404(id: string, userId: string) {
  const launcher = await prisma.launcher.findUnique({ where: { id } });
  if (!launcher || launcher.ownerId !== userId) return null;
  return launcher;
}

// GET /api/launchers/:id — configuration complète pour l'éditeur.
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { id } = await params;

  const launcher = await ownLauncherOr404(id, session.userId);
  if (!launcher) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json(rowToForm(launcher));
}

// PUT /api/launchers/:id — mise à jour partielle par le propriétaire.
export async function PUT(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = LauncherUpdateSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const { launcher, updated } = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "Launcher"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const current = await tx.launcher.findUnique({ where: { id } });
      if (!current || current.ownerId !== session.userId) {
        throw new LauncherOwnerMutationError(404, "NOT_FOUND", "Introuvable");
      }
      assertOwnerMutationAllowed(current.suspendedAt);

      if ((data.memMin ?? current.memMin) > (data.memMax ?? current.memMax)) {
        throw new LauncherOwnerMutationError(
          400,
          "INVALID_MEMORY",
          "La RAM minimale dépasse la RAM maximale",
        );
      }
      if (data.slug && data.slug !== current.slug) {
        await assertNoActivePlayerBans(tx, current.id);
        const taken = await tx.launcher.findUnique({
          where: { slug: data.slug },
          select: { id: true },
        });
        if (taken) {
          throw new LauncherOwnerMutationError(
            409,
            "SLUG_TAKEN",
            "Code (slug) déjà utilisé",
          );
        }
      }

      const next = await tx.launcher.update({
        where: { id },
        data: toUpdateData(data),
      });
      return { launcher: current, updated: next };
    });

    const cleanup: Promise<boolean>[] = [];
    if (data.logoUrl !== undefined && data.logoUrl !== launcher.logoUrl) {
      cleanup.push(deleteUpload(launcher.logoUrl, launcher.id));
    }
    if (
      data.backgroundUrl !== undefined &&
      data.backgroundUrl !== launcher.backgroundUrl
    ) {
      cleanup.push(deleteUpload(launcher.backgroundUrl, launcher.id));
    }
    await Promise.all(cleanup).catch((error) => {
      // La mise à jour est déjà validée ; un échec fournisseur reste journalisé
      // sans transformer l'opération fonctionnelle en erreur.
      console.error("Replaced launcher asset cleanup failed", error);
    });
    return NextResponse.json({ ok: true, slug: updated.slug });
  } catch (error) {
    if (error instanceof LauncherOwnerMutationError) {
      return ownerMutationErrorResponse(error);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Code (slug) déjà utilisé", code: "SLUG_TAKEN" },
        { status: 409 },
      );
    }
    throw error;
  }
}

// DELETE /api/launchers/:id — suppression interdite pendant une suspension.
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { id } = await params;

  let launcher;
  try {
    launcher = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "Launcher"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const current = await tx.launcher.findUnique({ where: { id } });
      if (!current || current.ownerId !== session.userId) {
        throw new LauncherOwnerMutationError(404, "NOT_FOUND", "Introuvable");
      }
      assertOwnerMutationAllowed(current.suspendedAt);
      await assertNoActivePlayerBans(tx, current.id);
      await tx.launcher.delete({ where: { id } });
      return current;
    });
  } catch (error) {
    if (error instanceof LauncherOwnerMutationError) {
      return ownerMutationErrorResponse(error);
    }
    throw error;
  }

  await deleteUploadNamespace(launcher.id).catch((error) => {
    console.error("Deleted launcher asset cleanup failed", {
      launcherId: launcher.id,
      error,
    });
  });
  return NextResponse.json({ ok: true });
}

function assertOwnerMutationAllowed(suspendedAt: Date | null): void {
  if (!isLauncherSuspended(suspendedAt)) return;
  throw new LauncherOwnerMutationError(
    423,
    SUSPENDED_LAUNCHER_OWNER_ERROR.code,
    SUSPENDED_LAUNCHER_OWNER_ERROR.error,
  );
}

async function assertNoActivePlayerBans(
  tx: Prisma.TransactionClient,
  launcherId: string,
): Promise<void> {
  const activeBan = await tx.playerBan.findFirst({
    where: {
      launcherId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (!activeBan) return;
  throw new LauncherOwnerMutationError(
    423,
    "LAUNCHER_HAS_ACTIVE_PLAYER_BANS",
    "Ce launcher possède des interdictions joueur actives et ne peut pas libérer son code ni être supprimé.",
  );
}

function ownerMutationErrorResponse(error: LauncherOwnerMutationError) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status },
  );
}
