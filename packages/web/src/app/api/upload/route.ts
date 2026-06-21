import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo
const ALLOWED = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

// POST /api/upload (multipart) — champs: launcherId, kind (logo|background), file.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form invalide" }, { status: 400 });

  const launcherId = String(form.get("launcherId") ?? "");
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");

  if (!["logo", "background"].includes(kind)) {
    return NextResponse.json({ error: "kind invalide" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Type d'image non supporté" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)" }, { status: 413 });
  }

  const launcher = await prisma.launcher.findUnique({ where: { id: launcherId } });
  if (!launcher || launcher.ownerId !== session.userId) {
    return NextResponse.json({ error: "Launcher introuvable" }, { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const { relativePath } = await saveUpload(launcherId, file.name, buf);

  await prisma.launcher.update({
    where: { id: launcherId },
    data: kind === "logo" ? { logoUrl: relativePath } : { backgroundUrl: relativePath },
  });

  return NextResponse.json({ relativePath });
}
