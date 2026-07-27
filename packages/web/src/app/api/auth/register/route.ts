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
  const { username, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "Nom d'utilisateur déjà pris" },
      { status: 409 },
    );
  }

  let user;
  try {
    user = await prisma.user.create({
      data: { username, password: await hashPassword(password) },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Nom d'utilisateur déjà pris" },
        { status: 409 },
      );
    }
    throw error;
  }
  await createSession({ userId: user.id, username: user.username });

  return NextResponse.json({ ok: true, username: user.username });
}
