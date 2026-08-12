import { NextResponse } from "next/server";
import {
  CatalogError,
  openCurseForgeProxyFile,
  verifyCurseForgeDownloadToken,
} from "../../../../../../../lib/content-catalog";
import { consumeRateLimit } from "../../../../../../../lib/rate-limit";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ projectId: string; fileId: string }>;
};

export async function GET(request: Request, { params }: Context) {
  if (
    !consumeRateLimit(request, "content-catalog-download", 600, 60 * 60_000)
  ) {
    return NextResponse.json(
      { error: "Limite de téléchargement atteinte." },
      { status: 429 },
    );
  }

  const values = await params;
  if (
    !/^\d{1,12}$/.test(values.projectId) ||
    !/^\d{1,12}$/.test(values.fileId)
  ) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }
  const projectId = Number(values.projectId);
  const fileId = Number(values.fileId);
  const token = new URL(request.url).searchParams.get("token") ?? "";

  try {
    if (!verifyCurseForgeDownloadToken(projectId, fileId, token)) {
      return NextResponse.json(
        { error: "Lien de téléchargement invalide." },
        { status: 403 },
      );
    }
    const file = await openCurseForgeProxyFile(projectId, fileId);
    return new Response(file.response.body, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Content-Length": String(file.size),
        "Content-Type": file.fileName.toLowerCase().endsWith(".jar")
          ? "application/java-archive"
          : "application/zip",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof CatalogError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status: error.status,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    console.error("CurseForge proxy download failed", error);
    return NextResponse.json(
      { error: "Téléchargement temporairement indisponible." },
      { status: 502 },
    );
  }
}
