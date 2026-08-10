import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";
import { isManagedUpload } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/launchers/:id/duplicate — clone un launcher (statut brouillon).
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;

  const src = await prisma.launcher.findUnique({ where: { id } });
  if (!src || src.ownerId !== session.userId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const launcherCount = await prisma.launcher.count({
    where: { ownerId: session.userId },
  });
  if (launcherCount >= MAX_LAUNCHERS_PER_USER) {
    return NextResponse.json(
      {
        error: `La limite actuelle est de ${MAX_LAUNCHERS_PER_USER} launchers par compte.`,
      },
      { status: 409 },
    );
  }

  // Génère un slug libre : "<slug>-copie", "-copie-2", etc.
  const base = `${src.slug}-copie`.slice(0, 36);
  let slug = base;
  let n = 1;
  while (await prisma.launcher.findUnique({ where: { slug } })) {
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
    ...rest
  } = src;
  const copy = await prisma.launcher.create({
    data: {
      ...rest,
      // Les fichiers gérés appartiennent à l'espace du launcher source. Une
      // copie ne doit pas partager un objet qui disparaîtra avec sa suppression.
      logoUrl: isManagedUpload(src.logoUrl, src.id) ? null : src.logoUrl,
      backgroundUrl: isManagedUpload(src.backgroundUrl, src.id)
        ? null
        : src.backgroundUrl,
      slug,
      title: `${title} (copie)`.slice(0, 60),
      status: "draft",
      favorite: false,
    },
  });

  return NextResponse.json({ id: copy.id, slug: copy.slug });
}
