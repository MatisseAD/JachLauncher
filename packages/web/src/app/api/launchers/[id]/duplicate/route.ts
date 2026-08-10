import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";
import { isManagedUpload } from "@/lib/storage";
import {
  isLauncherSuspended,
  SUSPENDED_LAUNCHER_OWNER_ERROR,
} from "@/lib/launcher-suspension";

type Ctx = { params: Promise<{ id: string }> };

class DuplicateError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// POST /api/launchers/:id/duplicate — clone un launcher actif en brouillon.
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const copy = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "Launcher"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const source = await tx.launcher.findUnique({ where: { id } });
      if (!source || source.ownerId !== session.userId) {
        throw new DuplicateError(404, "NOT_FOUND", "Introuvable");
      }
      if (isLauncherSuspended(source.suspendedAt)) {
        throw new DuplicateError(
          423,
          SUSPENDED_LAUNCHER_OWNER_ERROR.code,
          SUSPENDED_LAUNCHER_OWNER_ERROR.error,
        );
      }

      const activeBan = await tx.playerBan.findFirst({
        where: {
          launcherId: source.id,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      });
      if (activeBan) {
        throw new DuplicateError(
          423,
          "LAUNCHER_HAS_ACTIVE_PLAYER_BANS",
          "Ce launcher possède des interdictions joueur actives et ne peut pas être dupliqué.",
        );
      }

      const launcherCount = await tx.launcher.count({
        where: { ownerId: session.userId },
      });
      if (launcherCount >= MAX_LAUNCHERS_PER_USER) {
        throw new DuplicateError(
          409,
          "LAUNCHER_LIMIT_REACHED",
          `La limite actuelle est de ${MAX_LAUNCHERS_PER_USER} launchers par compte.`,
        );
      }

      // Génère un slug libre : "<slug>-copie", "-copie-2", etc.
      const base = `${source.slug}-copie`.slice(0, 36);
      let slug = base;
      let n = 1;
      while (await tx.launcher.findUnique({ where: { slug } })) {
        n += 1;
        const suffix = `-${n}`;
        slug = `${base.slice(0, 40 - suffix.length)}${suffix}`;
      }

      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        slug: _slug,
        title,
        suspendedAt: _suspendedAt,
        suspensionReason: _suspensionReason,
        suspendedById: _suspendedById,
        ...rest
      } = source;
      return tx.launcher.create({
        data: {
          ...rest,
          // Les fichiers gérés appartiennent à l'espace du launcher source. Une
          // copie ne partage pas un objet supprimable avec son origine.
          logoUrl: isManagedUpload(source.logoUrl, source.id)
            ? null
            : source.logoUrl,
          backgroundUrl: isManagedUpload(source.backgroundUrl, source.id)
            ? null
            : source.backgroundUrl,
          slug,
          title: `${title} (copie)`.slice(0, 60),
          status: "draft",
          favorite: false,
          suspendedAt: null,
          suspensionReason: null,
          suspendedById: null,
        },
      });
    });

    return NextResponse.json({ id: copy.id, slug: copy.slug });
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    throw error;
  }
}
