import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import {
  consumeUserUploadQuota,
  MAX_USER_UPLOAD_BYTES_PER_DAY,
  MAX_USER_UPLOADS_PER_DAY,
} from "@/lib/upload-quota";
import { consumeRateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo
const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

// POST /api/upload (multipart) — champs: launcherId, kind (logo|background), file.
export async function POST(req: Request) {
  if (!consumeRateLimit(req, "asset-upload", 60, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Trop d’envois, réessaie plus tard" },
      { status: 429 },
    );
  }
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
  let quotaAvailable: boolean;
  try {
    quotaAvailable = await consumeUserUploadQuota(session.userId, file.size);
  } catch (error) {
    console.error("Upload quota unavailable", error);
    return NextResponse.json(
      { error: "Le service d’upload est temporairement indisponible" },
      { status: 503 },
    );
  }
  if (!quotaAvailable) {
    return NextResponse.json(
      {
        error: `Quota atteint (${MAX_USER_UPLOADS_PER_DAY} fichiers ou ${Math.floor(MAX_USER_UPLOAD_BYTES_PER_DAY / 1024 / 1024)} Mo par jour).`,
      },
      { status: 429 },
    );
  }

  const { relativePath } = await saveUpload(
    launcherId,
    EXTENSIONS[file.type],
    buf,
  );

  // La référence est écrite par le PUT sérialisé de l'éditeur. Garder une seule
  // voie d'écriture évite qu'une ancienne autosauvegarde rétablisse un asset
  // déjà supprimé. Les objets non rattachés restent bornés par le quota et sont
  // purgés avec le namespace du launcher.
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
