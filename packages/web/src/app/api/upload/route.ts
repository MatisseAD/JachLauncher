import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo
const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

// POST /api/upload (multipart) — champs: launcherId, kind (logo|background), file.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: "Form invalide" }, { status: 400 });

  const launcherId = String(form.get("launcherId") ?? "");
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");

  if (!["logo", "background"].includes(kind)) {
    return NextResponse.json({ error: "kind invalide" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!EXTENSIONS[file.type]) {
    return NextResponse.json(
      { error: "Type d'image non supporté" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 8 Mo)" },
      { status: 413 },
    );
  }

  const launcher = await prisma.launcher.findUnique({
    where: { id: launcherId },
  });
  if (!launcher || launcher.ownerId !== session.userId) {
    return NextResponse.json(
      { error: "Launcher introuvable" },
      { status: 404 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(buf, file.type)) {
    return NextResponse.json(
      { error: "Le contenu du fichier ne correspond pas à son type" },
      { status: 415 },
    );
  }
  const { relativePath } = await saveUpload(
    launcherId,
    EXTENSIONS[file.type],
    buf,
  );

  await prisma.launcher.update({
    where: { id: launcherId },
    data:
      kind === "logo"
        ? { logoUrl: relativePath }
        : { backgroundUrl: relativePath },
  });

  return NextResponse.json({ relativePath });
}

function matchesImageSignature(data: Buffer, type: string): boolean {
  if (type === "image/png") {
    return data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (type === "image/jpeg") {
    return (
      data.length >= 3 &&
      data[0] === 0xff &&
      data[1] === 0xd8 &&
      data[2] === 0xff
    );
  }
  if (type === "image/gif") {
    const header = data.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  if (type === "image/webp") {
    return (
      data.subarray(0, 4).toString("ascii") === "RIFF" &&
      data.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}
