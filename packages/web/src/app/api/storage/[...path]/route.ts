import { NextResponse } from "next/server";
import { readUpload, contentTypeFor } from "@/lib/storage";

type Ctx = { params: Promise<{ path: string[] }> };

// GET /api/storage/<launcherId>/<file> — sert un asset uploadé. Public.
export async function GET(_req: Request, { params }: Ctx) {
  const { path } = await params;
  const relativePath = path.join("/");

  const data = await readUpload(relativePath);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(relativePath),
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
