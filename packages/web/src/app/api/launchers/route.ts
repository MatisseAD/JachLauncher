import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { LauncherInputSchema } from "@/lib/validation";
import { toCreateData } from "@/lib/launcher-data";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";
import { Prisma } from "@prisma/client";

// GET /api/launchers — liste les launchers de l'utilisateur connecté.
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const launchers = await prisma.launcher.findMany({
    where: { ownerId: session.userId },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      favorite: true,
      logoUrl: true,
      backgroundUrl: true,
      primaryColor: true,
      secondaryColor: true,
      mcVersion: true,
      loader: true,
      launcherType: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ launchers });
}

// POST /api/launchers — crée un launcher.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const parsed = LauncherInputSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

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

  const slugTaken = await prisma.launcher.findUnique({
    where: { slug: data.slug },
  });
  if (slugTaken) {
    return NextResponse.json(
      { error: "Ce code (slug) est déjà utilisé" },
      { status: 409 },
    );
  }

  try {
    const launcher = await prisma.launcher.create({
      data: toCreateData(data, session.userId),
    });
    return NextResponse.json({ id: launcher.id, slug: launcher.slug });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ce code (slug) est déjà utilisé" },
        { status: 409 },
      );
    }
    throw error;
  }
}
