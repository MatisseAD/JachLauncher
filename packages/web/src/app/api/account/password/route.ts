import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
});

// POST /api/account/password — change le mot de passe de l'utilisateur connecté.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.password))) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(parsed.data.newPassword) },
  });

  return NextResponse.json({ ok: true });
}
