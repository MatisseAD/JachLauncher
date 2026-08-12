import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  CatalogError,
  CatalogResolveInputSchema,
  resolveCatalogItem,
} from "@/lib/content-catalog";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  if (
    !consumeRateLimit(
      request,
      `content-catalog-resolve:${session.userId}`,
      40,
      10 * 60_000,
    )
  ) {
    return NextResponse.json(
      { error: "Trop d’ajouts rapprochés. Réessaie dans quelques minutes." },
      { status: 429 },
    );
  }

  const parsed = CatalogResolveInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Sélection de contenu invalide." },
      { status: 400 },
    );
  }

  try {
    const resolution = await resolveCatalogItem(parsed.data);
    return NextResponse.json(resolution, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof CatalogError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("Content catalog resolution failed", error);
    return NextResponse.json(
      { error: "Ce contenu ne peut pas être ajouté pour le moment." },
      { status: 502 },
    );
  }
}
