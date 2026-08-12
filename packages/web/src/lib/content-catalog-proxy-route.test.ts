import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/content-catalog/download/curseforge/[projectId]/[fileId]/route";

const catalog = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  openFile: vi.fn(),
}));

vi.mock("./content-catalog", async (loadOriginal) => {
  const original = await loadOriginal<typeof import("./content-catalog")>();
  return {
    ...original,
    verifyCurseForgeDownloadToken: catalog.verifyToken,
    openCurseForgeProxyFile: catalog.openFile,
  };
});

vi.mock("./rate-limit", () => ({ consumeRateLimit: () => true }));

function request(token = "signed-token") {
  return GET(
    new Request(
      `https://yourlauncher.example/api/content-catalog/download/curseforge/123/456?token=${token}`,
    ),
    { params: Promise.resolve({ projectId: "123", fileId: "456" }) },
  );
}

describe("proxy de téléchargement CurseForge", () => {
  beforeEach(() => {
    catalog.verifyToken.mockReset();
    catalog.openFile.mockReset();
  });

  it("refuse le téléchargement avant tout accès amont si le jeton est invalide", async () => {
    catalog.verifyToken.mockReturnValue(false);
    const response = await request("invalid");
    expect(response.status).toBe(403);
    expect(catalog.openFile).not.toHaveBeenCalled();
  });

  it("diffuse uniquement le flux revalidé avec taille exacte et no-store", async () => {
    const bytes = new TextEncoder().encode("verified");
    catalog.verifyToken.mockReturnValue(true);
    catalog.openFile.mockResolvedValue({
      response: new Response(Buffer.from(bytes)),
      fileName: "verified.jar",
      size: bytes.byteLength,
    });

    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-length")).toBe(
      String(bytes.byteLength),
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(catalog.openFile).toHaveBeenCalledWith(123, 456);
  });
});
