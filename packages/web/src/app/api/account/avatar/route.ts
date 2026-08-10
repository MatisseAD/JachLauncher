import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { deleteUpload, saveUpload } from "@/lib/storage";
import {
  consumeUserUploadQuota,
  MAX_USER_UPLOAD_BYTES_PER_DAY,
  MAX_USER_UPLOADS_PER_DAY,
} from "@/lib/upload-quota";

const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export async function POST(req: Request) {
  if (!consumeRateLimit(req, "asset-upload", 60, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Trop d’envois, réessaie plus tard" },
      { status: 429 },
    );
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image manquante" }, { status: 400 });
  }
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Utilise une image PNG, JPG ou WebP." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "L’image ne doit pas dépasser 4 Mo." },
      { status: 413 },
    );
  }

  const data = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(data, file.type)) {
    return NextResponse.json(
      { error: "Le contenu du fichier n’est pas une image valide." },
      { status: 415 },
    );
  }

  let quotaAvailable: boolean;
  try {
    quotaAvailable = await consumeUserUploadQuota(session.userId, file.size);
  } catch (error) {
    console.error("Avatar upload quota unavailable", error);
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { avatarUrl: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const namespace = `avatar-${session.userId}`;
  const { relativePath } = await saveUpload(namespace, extension, data);
  try {
    const updated = await prisma.user.updateMany({
      where: { id: session.userId, avatarUrl: user.avatarUrl },
      data: { avatarUrl: relativePath },
    });
    if (updated.count !== 1) {
      await deleteUpload(relativePath, namespace);
      return NextResponse.json(
        { error: "L’avatar a changé entre-temps, réessaie." },
        { status: 409 },
      );
    }
  } catch (error) {
    await deleteUpload(relativePath, namespace).catch((cleanupError) => {
      console.error("New avatar cleanup failed", cleanupError);
    });
    throw error;
  }

  await deleteUpload(user.avatarUrl, namespace).catch((error) => {
    console.error("Previous avatar cleanup failed", error);
  });
  return NextResponse.json({ ok: true, avatarUrl: relativePath });
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
  return (
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  );
}
