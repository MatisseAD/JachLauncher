import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/launchers/:id/duplicate — clone un launcher (statut brouillon).
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;

  const src = await prisma.launcher.findUnique({ where: { id } });
  if (!src || src.ownerId !== session.userId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  // Génère un slug libre : "<slug>-copie", "-copie-2", etc.
  let base = `${src.slug}-copie`.slice(0, 36);
  let slug = base;
  let n = 1;
  while (await prisma.launcher.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const { id: _id, createdAt, updatedAt, slug: _slug, title, ...rest } = src;
  const copy = await prisma.launcher.create({
    data: {
      ...rest,
      slug,
      title: `${title} (copie)`,
      status: "draft",
      favorite: false,
    },
  });

  return NextResponse.json({ id: copy.id, slug: copy.slug });
}
