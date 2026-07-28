import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildManifest } from "@/lib/manifest";

type Ctx = { params: Promise<{ slug: string }> };

// GET /api/manifest/:slug — PUBLIC. Consommé par le launcher desktop.
// Pas d'authentification : c'est la config distribuée aux joueurs.
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;

  const launcher = await prisma.launcher
    .findUnique({ where: { slug } })
    .catch(() => null);
  if (!launcher || launcher.status !== "published") {
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
    const manifest = buildManifest(launcher, origin);
    if (!download && req.headers.get("x-yourlauncher-client") === "desktop") {
      await recordDesktopLoad(launcher.id);
    }
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

async function recordDesktopLoad(launcherId: string) {
  const now = new Date();
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  await prisma.launcherDailyMetric
    .upsert({
      where: { launcherId_day: { launcherId, day } },
      create: { launcherId, day, manifestLoads: 1 },
      update: { manifestLoads: { increment: 1 } },
    })
    .catch((error) => {
      console.error("Launcher metric update failed", {
        launcherId,
        error: String(error),
      });
    });
}

// Le launcher Electron fait des requêtes cross-origin : on autorise.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, X-YourLauncher-Client",
    "Cache-Control": "no-store",
  };
}
