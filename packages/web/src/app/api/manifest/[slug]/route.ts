import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildManifest, signManifest } from "@/lib/manifest";
import { buildDemoManifest, getDemoLauncher } from "@/lib/demo-launchers";

type Ctx = { params: Promise<{ slug: string }> };

// GET /api/manifest/:slug — PUBLIC. Consommé par le launcher desktop.
// Pas d'authentification : c'est la config distribuée aux joueurs.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;

  const demo = getDemoLauncher(slug);
  // Les démonstrations intégrées sont canoniques : une ancienne ligne en base
  // portant le même slug ne doit jamais pouvoir les masquer ou les détourner.
  const launcher = demo
    ? null
    : await prisma.launcher.findUnique({ where: { slug } }).catch(() => null);
  if ((!launcher || launcher.status !== "published") && !demo) {
    return NextResponse.json(
      { error: "Aucun launcher publié avec ce code" },
      { status: 404, headers: corsHeaders() },
    );
  }

  const reqUrl = new URL(req.url);
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || reqUrl.origin;
  const download = reqUrl.searchParams.get("download") === "1";
  try {
    const manifest = demo
      ? signManifest(buildDemoManifest(demo, origin))
      : buildManifest(launcher!, origin);
    const headers = corsHeaders();
    if (download) {
      headers["Content-Disposition"] =
        `attachment; filename="${slug}.manifest.json"`;
    }
    return NextResponse.json(manifest, { headers });
  } catch (e) {
    console.error("Manifest build failed", { slug, error: String(e) });
    return NextResponse.json(
      { error: "La configuration publiée est invalide" },
      { status: 422, headers: corsHeaders() },
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
    // Conservé pour compatibilité avec les versions desktop déjà publiées.
    // Cet en-tête n'est volontairement pas considéré comme une preuve fiable.
    "Access-Control-Allow-Headers": "Accept, X-YourLauncher-Client",
    "Cache-Control": "no-store",
  };
}
