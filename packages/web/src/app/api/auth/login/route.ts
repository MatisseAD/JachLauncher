import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const Body = z.object({
  username: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  if (!consumeRateLimit(req, "login", 10, 15 * 60_000)) {
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

  try {
    const normalized = username.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: normalized }, { email: normalized.toLowerCase() }],
      },
    });
    const hash =
      user?.password ??
      "$2b$10$BfF.1MWtfHYgmC2JcN5PzuVLRE1kwATJekMG4uZ23TwkbZuv3ya4u";
    const valid = await verifyPassword(password, hash);
    if (!user || !valid) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 },
      );
    }

    await createSession({ userId: user.id, username: user.username });
    return NextResponse.json({ ok: true, username: user.username });
  } catch (error) {
    console.error("Échec de la connexion", error);
    return NextResponse.json(
      { error: "Service de connexion temporairement indisponible" },
      { status: 503 },
    );
  }
}
