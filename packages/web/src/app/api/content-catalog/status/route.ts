import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isCurseForgeCatalogReady } from "@/lib/content-catalog";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  return NextResponse.json(
    {
      providers: {
        modrinth: { available: true },
        curseforge: { available: isCurseForgeCatalogReady() },
      },
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
