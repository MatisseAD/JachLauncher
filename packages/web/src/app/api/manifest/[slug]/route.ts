import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildManifest } from "@/lib/manifest";

type Ctx = { params: Promise<{ slug: string }> };

// GET /api/manifest/:slug — PUBLIC. Consommé par le launcher desktop.
// Pas d'authentification : c'est la config distribuée aux joueurs.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;

  const launcher = await prisma.launcher.findUnique({ where: { slug } });
  if (!launcher) {
    return NextResponse.json(
      { error: "Aucun launcher avec ce code" },
      { status: 404, headers: corsHeaders() },
    );
  }

  const reqUrl = new URL(req.url);
  const origin = reqUrl.origin;
  const download = reqUrl.searchParams.get("download") === "1";
  try {
    const manifest = buildManifest(launcher, origin);
    const headers = corsHeaders();
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${slug}.manifest.json"`;
    }
    return NextResponse.json(manifest, { headers });
  } catch (e) {
    return NextResponse.json(
      { error: "Manifeste invalide", detail: String(e) },
      { status: 500, headers: corsHeaders() },
    );
  }
}

// Le launcher Electron fait des requêtes cross-origin : on autorise.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store",
  };
}
