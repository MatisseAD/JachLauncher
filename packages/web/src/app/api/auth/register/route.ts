import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

const Body = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .or(z.literal(""))
    .optional()
    .transform((value) => value?.toLowerCase() || null),
});

export async function POST(req: Request) {
  if (!consumeRateLimit(req, "register", 5, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessaie plus tard" },
      { status: 429 },
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { username, password, email } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "Nom d'utilisateur déjà pris" },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: { username, email, password: await hashPassword(password) },
    });
    await createSession({ userId: user.id, username: user.username });
    return NextResponse.json({ ok: true, username: user.username });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = String(error.meta?.target ?? "");
      return NextResponse.json(
        {
          error: target.includes("email")
            ? "Cette adresse e-mail est déjà utilisée"
            : "Nom d'utilisateur déjà pris",
        },
        { status: 409 },
      );
    }
    console.error("Échec de l'inscription", error);
    return NextResponse.json(
      { error: "Service d'inscription temporairement indisponible" },
      { status: 503 },
    );
  }
}
