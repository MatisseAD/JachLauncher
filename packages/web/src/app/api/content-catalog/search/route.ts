import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  CatalogError,
  CatalogSearchInputSchema,
  searchCatalog,
} from "@/lib/content-catalog";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  if (
    !consumeRateLimit(
      request,
      `content-catalog-search:${session.userId}`,
      60,
      60_000,
    )
  ) {
    return NextResponse.json(
      { error: "Trop de recherches. Réessaie dans une minute." },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const parsed = CatalogSearchInputSchema.safeParse({
    provider: url.searchParams.get("provider"),
    kind: url.searchParams.get("kind"),
    query: url.searchParams.get("query"),
    minecraftVersion: url.searchParams.get("minecraftVersion"),
    loader: url.searchParams.get("loader"),
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres de recherche invalides." },
      { status: 400 },
    );
  }

  try {
    const results = await searchCatalog(parsed.data);
    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control":
            parsed.data.provider === "curseforge"
              ? "private, no-store"
              : "private, max-age=60",
        },
      },
    );
  } catch (error) {
    return catalogErrorResponse(error);
  }
}

function catalogErrorResponse(error: unknown) {
  if (error instanceof CatalogError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("Content catalog search failed", error);
  return NextResponse.json(
    { error: "Recherche temporairement indisponible." },
    { status: 502 },
  );
}
