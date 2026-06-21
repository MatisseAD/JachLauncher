import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { LauncherUpdateSchema } from "@/lib/validation";
import { toUpdateData } from "@/lib/launcher-data";

type Ctx = { params: Promise<{ id: string }> };

async function ownLauncherOr404(id: string, userId: string) {
  const launcher = await prisma.launcher.findUnique({ where: { id } });
  if (!launcher || launcher.ownerId !== userId) return null;
  return launcher;
}

// GET /api/launchers/:id — config complète (pour l'éditeur).
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;

  const launcher = await ownLauncherOr404(id, session.userId);
  if (!launcher) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    ...launcher,
    mods: JSON.parse(launcher.mods),
    resourcepacks: JSON.parse(launcher.resourcepacks),
    shaderpacks: JSON.parse(launcher.shaderpacks),
    news: JSON.parse(launcher.news),
    jvmArgs: JSON.parse(launcher.jvmArgs),
  });
}

// PUT /api/launchers/:id — met à jour (partiel).
export async function PUT(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;

  const launcher = await ownLauncherOr404(id, session.userId);
  if (!launcher) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = LauncherUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Si le slug change, vérifier l'unicité.
  if (d.slug && d.slug !== launcher.slug) {
    const taken = await prisma.launcher.findUnique({ where: { slug: d.slug } });
    if (taken) return NextResponse.json({ error: "Code (slug) déjà utilisé" }, { status: 409 });
  }

  const updated = await prisma.launcher.update({
    where: { id },
    data: toUpdateData(d),
  });

  return NextResponse.json({ ok: true, slug: updated.slug });
}

// DELETE /api/launchers/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;

  const launcher = await ownLauncherOr404(id, session.userId);
  if (!launcher) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.launcher.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
