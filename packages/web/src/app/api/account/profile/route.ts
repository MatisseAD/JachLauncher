import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createSession, getSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

const Body = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  email: z
    .string()
    .trim()
    .max(254)
    .email()
    .or(z.literal(""))
    .transform((value) => value.toLowerCase()),
  currentPassword: z.string().min(1).max(128),
});

export async function PUT(req: Request) {
  if (!consumeRateLimit(req, "profile-update", 8, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessaie plus tard" },
      { status: 429 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Vérifie le pseudo, l’adresse e-mail et le mot de passe." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (
    !user ||
    !(await verifyPassword(parsed.data.currentPassword, user.password))
  ) {
    return NextResponse.json(
      { error: "Mot de passe actuel incorrect" },
      { status: 401 },
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: parsed.data.username,
        email: parsed.data.email || null,
      },
      select: { username: true, email: true, avatarUrl: true },
    });
    await createSession({ userId: user.id, username: updated.username });
    return NextResponse.json({ ok: true, profile: updated });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = String(error.meta?.target ?? "");
      return NextResponse.json(
        {
          error: target.includes("email")
            ? "Cette adresse e-mail est déjà utilisée."
            : "Ce pseudo est déjà utilisé.",
        },
        { status: 409 },
      );
    }
    console.error("Échec de la mise à jour du profil", error);
    return NextResponse.json(
      { error: "Profil temporairement indisponible" },
      { status: 503 },
    );
  }
}
