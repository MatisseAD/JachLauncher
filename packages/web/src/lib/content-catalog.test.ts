import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CatalogError,
  CatalogResolveInputSchema,
  CatalogSearchInputSchema,
  createCurseForgeProxyUrl,
  createCurseForgeDownloadToken,
  openCurseForgeProxyFile,
  resetContentCatalogCachesForTests,
  resolveCatalogItem,
  searchCatalog,
  verifyCurseForgeDownloadToken,
} from "./content-catalog";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function binaryResponse(value: Uint8Array): Response {
  return new Response(Buffer.from(value), {
    status: 200,
    headers: { "Content-Length": String(value.byteLength) },
  });
}

function requestUrl(input: string | URL | Request): URL {
  return new URL(input instanceof Request ? input.url : input.toString());
}

const BASE_SEARCH = {
  provider: "modrinth" as const,
  kind: "mod" as const,
  query: "sodium",
  minecraftVersion: "1.21.1",
  loader: "fabric" as const,
  limit: 12,
};

describe.sequential("content catalog", () => {
  beforeEach(() => {
    resetContentCatalogCachesForTests();
    vi.unstubAllEnvs();
  });

  it("refuse les propriétés inconnues dans les contrats entrants", () => {
    expect(
      CatalogSearchInputSchema.safeParse({ ...BASE_SEARCH, unexpected: true })
        .success,
    ).toBe(false);
    expect(
      CatalogResolveInputSchema.safeParse({
        provider: "modrinth",
        kind: "mod",
        projectId: "AABBCCDD",
        minecraftVersion: "1.21.1",
        loader: "fabric",
        url: "https://example.com/evil.jar",
      }).success,
    ).toBe(false);
  });

  it("refuse un catalogue de mods sans loader compatible", () => {
    const result = CatalogSearchInputSchema.safeParse({
      ...BASE_SEARCH,
      loader: "vanilla",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["loader"]);
    }
  });

  it("recherche Modrinth avec les facettes version, type et loader", async () => {
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = requestUrl(input);
        expect(url.origin).toBe("https://api.modrinth.com");
        expect(url.pathname).toBe("/v2/search");
        expect(new Headers(init?.headers).get("user-agent")).toBe(
          "YourLauncher/3.0.1 (https://yourlauncher.vercel.app)",
        );
        expect(JSON.parse(url.searchParams.get("facets") ?? "[]")).toEqual([
          ["project_type:mod"],
          ["versions:1.21.1"],
          ["categories:fabric"],
        ]);
        return jsonResponse({
          hits: [
            {
              project_id: "AABBCCDD",
              project_type: "mod",
              slug: "sodium",
              title: "Sodium",
              description: "Optimisation du rendu",
              author: "jellysquid3",
              downloads: 123456,
              icon_url: "https://cdn.modrinth.com/data/AABBCCDD/icon.png",
              license: "LGPL-3.0-only",
            },
          ],
        });
      },
    ) as unknown as typeof fetch;

    const results = await searchCatalog(BASE_SEARCH, { fetchImpl });
    expect(results).toEqual([
      expect.objectContaining({
        provider: "modrinth",
        projectId: "AABBCCDD",
        title: "Sodium",
        installable: true,
        projectUrl: "https://modrinth.com/mod/sodium",
      }),
    ]);
  });

  it("ne force aucun loader pour les packs de ressources", async () => {
    const bytes = new TextEncoder().encode("resource-pack");
    const fetchImpl = createModrinthResolverFetch(
      bytes,
      (url) => {
        if (url.pathname.endsWith("/version")) {
          expect(url.searchParams.has("loaders")).toBe(false);
        }
      },
      [],
      undefined,
      undefined,
      "resourcepack",
    );

    const result = await resolveCatalogItem(
      {
        provider: "modrinth",
        kind: "resourcepack",
        projectId: "AABBCCDD",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl },
    );
    expect(result.file.fileName).toBe("content.zip");
  });

  it("sélectionne le fichier compatible, vérifie SHA-512 et calcule SHA-256", async () => {
    const bytes = new TextEncoder().encode("verified-mod-content");
    const fetchImpl = createModrinthResolverFetch(bytes);

    const result = await resolveCatalogItem(
      {
        provider: "modrinth",
        kind: "mod",
        projectId: "AABBCCDD",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl },
    );

    expect(result.file).toEqual(
      expect.objectContaining({
        source: "modrinth",
        fileName: "content.jar",
        size: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      }),
    );
  });

  it("retourne les dépendances Modrinth requises sans les dépendances optionnelles", async () => {
    const bytes = new TextEncoder().encode("mod-with-dependency");
    const fetchImpl = createModrinthResolverFetch(bytes, undefined, [
      {
        project_id: "Required1",
        version_id: "RequiredVersion1",
        dependency_type: "required",
      },
      {
        project_id: "Optional1",
        version_id: null,
        dependency_type: "optional",
      },
    ]);

    const result = await resolveCatalogItem(
      {
        provider: "modrinth",
        kind: "mod",
        projectId: "AABBCCDD",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl },
    );
    expect(result.requiredDependencies).toEqual([
      {
        provider: "modrinth",
        projectId: "Required1",
        kind: "mod",
        versionId: "RequiredVersion1",
      },
    ]);
  });

  it("sélectionne exactement la version Modrinth épinglée", async () => {
    const pinnedBytes = new TextEncoder().encode("pinned-version");
    const latestBytes = new TextEncoder().encode("latest-version");
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = requestUrl(input);
      if (url.pathname === "/v2/project/AABBCCDD") {
        return jsonResponse({
          id: "AABBCCDD",
          slug: "content",
          title: "Pinned content",
          description: "Pinned dependency",
          project_type: "mod",
        });
      }
      if (url.pathname === "/v2/project/AABBCCDD/version") {
        return jsonResponse([
          modrinthVersion({
            id: "LATEST1",
            projectId: "AABBCCDD",
            bytes: latestBytes,
            fileName: "latest.jar",
            published: "2026-08-10T12:00:00.000Z",
          }),
          modrinthVersion({
            id: "PINNED1",
            projectId: "AABBCCDD",
            bytes: pinnedBytes,
            fileName: "pinned.jar",
            published: "2026-07-01T12:00:00.000Z",
          }),
        ]);
      }
      if (url.pathname.endsWith("/pinned.jar")) {
        return binaryResponse(pinnedBytes);
      }
      if (url.pathname.endsWith("/latest.jar")) {
        return binaryResponse(latestBytes);
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as unknown as typeof fetch;

    const result = await resolveCatalogItem(
      {
        provider: "modrinth",
        kind: "mod",
        projectId: "AABBCCDD",
        versionId: "PINNED1",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl },
    );

    expect(result.file.fileName).toBe("pinned.jar");
  });

  it("refuse un projet Modrinth d'un autre type que la destination", async () => {
    const bytes = new TextEncoder().encode("wrong-kind");
    const baseFetch = createModrinthResolverFetch(bytes);
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = requestUrl(input);
        if (url.pathname === "/v2/project/AABBCCDD") {
          return jsonResponse({
            id: "AABBCCDD",
            slug: "wrong-kind",
            title: "Wrong kind",
            description: "Not a resource pack",
            project_type: "shader",
          });
        }
        return baseFetch(input, init);
      },
    ) as unknown as typeof fetch;

    await expect(
      resolveCatalogItem(
        {
          provider: "modrinth",
          kind: "resourcepack",
          projectId: "AABBCCDD",
          minecraftVersion: "1.21.1",
          loader: "fabric",
        },
        { fetchImpl },
      ),
    ).rejects.toMatchObject({ code: "UPSTREAM_MISMATCH" });
  });

  it("conserve le type réel d’une dépendance Modrinth", async () => {
    const bytes = new TextEncoder().encode("mod-with-resourcepack");
    const fetchImpl = createModrinthResolverFetch(
      bytes,
      undefined,
      [
        {
          project_id: "Resource1",
          version_id: null,
          dependency_type: "required",
        },
      ],
      undefined,
      { Resource1: "resourcepack" },
    );

    const result = await resolveCatalogItem(
      {
        provider: "modrinth",
        kind: "mod",
        projectId: "AABBCCDD",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl },
    );
    expect(result.requiredDependencies).toEqual([
      {
        provider: "modrinth",
        projectId: "Resource1",
        kind: "resourcepack",
      },
    ]);
  });

  it("accepte plus de 200 versions Modrinth avant de choisir la release", async () => {
    const bytes = new TextEncoder().encode("popular-project");
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = requestUrl(input);
      if (url.hostname === "cdn.modrinth.com") return binaryResponse(bytes);
      if (url.pathname === "/v2/project/POPULAR1") {
        return jsonResponse({
          id: "POPULAR1",
          slug: "popular",
          title: "Popular",
          description: "Many versions",
          project_type: "mod",
        });
      }
      if (url.pathname === "/v2/project/POPULAR1/version") {
        return jsonResponse(
          Array.from({ length: 250 }, (_, index) => ({
            id: `VERSION${index}`,
            project_id: "POPULAR1",
            version_number: `1.0.${index}`,
            version_type: index === 249 ? "release" : "beta",
            date_published: `2026-07-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
            status: "listed",
            dependencies: [],
            files: [
              {
                hashes: {
                  sha512: createHash("sha512").update(bytes).digest("hex"),
                  sha1: createHash("sha1").update(bytes).digest("hex"),
                },
                url: "https://cdn.modrinth.com/data/POPULAR1/versions/VERSION249/popular.jar",
                filename: "popular.jar",
                primary: true,
                size: bytes.byteLength,
              },
            ],
          })),
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as unknown as typeof fetch;

    const result = await resolveCatalogItem(
      {
        provider: "modrinth",
        kind: "mod",
        projectId: "POPULAR1",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl },
    );
    expect(result.file.version).toBe("1.0.249");
  });

  it("refuse une URL de fichier hors du CDN officiel", async () => {
    const bytes = new TextEncoder().encode("unsafe");
    const fetchImpl = createModrinthResolverFetch(
      bytes,
      undefined,
      [],
      "https://example.com/content.jar",
    );
    await expect(
      resolveCatalogItem(
        {
          provider: "modrinth",
          kind: "mod",
          projectId: "AABBCCDD",
          minecraftVersion: "1.21.1",
          loader: "fabric",
        },
        { fetchImpl },
      ),
    ).rejects.toMatchObject({ code: "UNSAFE_DOWNLOAD" });
  });

  it("désactive proprement CurseForge sans clé serveur", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    let failure: unknown;
    try {
      await searchCatalog(
        { ...BASE_SEARCH, provider: "curseforge" },
        { fetchImpl, curseForgeApiKey: null },
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(CatalogError);
    expect((failure as CatalogError).code).toBe("PROVIDER_DISABLED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("n’enregistre pas les recherches CurseForge dans le cache mémoire", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: [curseForgeProject()],
      }),
    ) as unknown as typeof fetch;

    const input = { ...BASE_SEARCH, provider: "curseforge" as const };
    await searchCatalog(input, { fetchImpl, curseForgeApiKey: "x".repeat(32) });
    await searchCatalog(input, { fetchImpl, curseForgeApiKey: "x".repeat(32) });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("authentifie le CDN CurseForge et produit une URL de proxy signée", async () => {
    vi.stubEnv("AUTH_SECRET", "catalog-secret-that-is-at-least-32-chars");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://yourlauncher.example");
    const bytes = new TextEncoder().encode("curse-file");
    const fetchImpl = createCurseForgeResolverFetch(bytes);

    const result = await resolveCatalogItem(
      {
        provider: "curseforge",
        kind: "mod",
        projectId: "123",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl, curseForgeApiKey: "curse-api-key-that-is-long-enough" },
    );
    const proxy = new URL(result.file.url);
    expect(proxy.origin).toBe("https://yourlauncher.example");
    expect(proxy.pathname).toBe(
      "/api/content-catalog/download/curseforge/123/456",
    );
    expect(
      verifyCurseForgeDownloadToken(
        123,
        456,
        proxy.searchParams.get("token") ?? "",
      ),
    ).toBe(true);
  });

  it("retourne les dépendances CurseForge requises pour la queue récursive", async () => {
    vi.stubEnv("AUTH_SECRET", "catalog-secret-that-is-at-least-32-chars");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://yourlauncher.example");
    const bytes = new TextEncoder().encode("curse-with-dependency");
    const fetchImpl = createCurseForgeResolverFetch(
      bytes,
      [
        { modId: 789, relationType: 3 },
        { modId: 790, relationType: 2 },
      ],
      { 789: 12 },
    );
    const result = await resolveCatalogItem(
      {
        provider: "curseforge",
        kind: "mod",
        projectId: "123",
        minecraftVersion: "1.21.1",
        loader: "fabric",
      },
      { fetchImpl, curseForgeApiKey: "curse-api-key-that-is-long-enough" },
    );
    expect(result.requiredDependencies).toEqual([
      { provider: "curseforge", projectId: "789", kind: "resourcepack" },
    ]);
  });

  it("revalide le fichier à chaque requête du proxy CurseForge", async () => {
    const bytes = new TextEncoder().encode("proxied-curse-file");
    const fetchImpl = createCurseForgeProxyFetch(bytes);
    const first = await openCurseForgeProxyFile(123, 456, {
      fetchImpl,
      curseForgeApiKey: "curse-api-key-that-is-long-enough",
    });
    const second = await openCurseForgeProxyFile(123, 456, {
      fetchImpl,
      curseForgeApiKey: "curse-api-key-that-is-long-enough",
    });
    expect(first.size).toBe(bytes.byteLength);
    expect(second.size).toBe(bytes.byteLength);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it("cesse de distribuer si l’auteur désactive la distribution CurseForge", async () => {
    const bytes = new TextEncoder().encode("revoked");
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = requestUrl(input);
      if (url.pathname === "/v1/mods/123") {
        return jsonResponse({
          data: { ...curseForgeProject(), allowModDistribution: false },
        });
      }
      if (url.pathname === "/v1/mods/123/files/456") {
        return jsonResponse({ data: curseForgeFile(bytes) });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as unknown as typeof fetch;

    await expect(
      openCurseForgeProxyFile(123, 456, {
        fetchImpl,
        curseForgeApiKey: "curse-api-key-that-is-long-enough",
      }),
    ).rejects.toMatchObject({ code: "DISTRIBUTION_NOT_ALLOWED" });
  });

  it("borne aussi un flux CurseForge sans Content-Length", async () => {
    const expected = new TextEncoder().encode("expected");
    const oversized = new TextEncoder().encode("expected-and-too-long");
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = requestUrl(input);
        expect(new Headers(init?.headers).get("x-api-key")).toBeTruthy();
        if (url.pathname === "/v1/mods/123") {
          return jsonResponse({ data: curseForgeProject() });
        }
        if (url.pathname === "/v1/mods/123/files/456") {
          return jsonResponse({ data: curseForgeFile(expected) });
        }
        if (url.hostname === "edge.forgecdn.net") {
          return new Response(Buffer.from(oversized), { status: 200 });
        }
        throw new Error(`Unexpected URL: ${url}`);
      },
    ) as unknown as typeof fetch;
    const proxied = await openCurseForgeProxyFile(123, 456, {
      fetchImpl,
      curseForgeApiKey: "curse-api-key-that-is-long-enough",
    });
    await expect(proxied.response.arrayBuffer()).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });

  it("ne coupe pas le corps CurseForge après le délai réservé aux en-têtes", async () => {
    const bytes = new TextEncoder().encode("slow-but-valid");
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = requestUrl(input);
        expect(new Headers(init?.headers).get("x-api-key")).toBeTruthy();
        if (url.pathname === "/v1/mods/123") {
          return jsonResponse({ data: curseForgeProject() });
        }
        if (url.pathname === "/v1/mods/123/files/456") {
          return jsonResponse({ data: curseForgeFile(bytes) });
        }
        if (url.hostname === "edge.forgecdn.net") {
          const signal = init?.signal;
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                signal?.addEventListener(
                  "abort",
                  () => controller.error(signal.reason),
                  { once: true },
                );
                setTimeout(() => {
                  controller.enqueue(bytes);
                  controller.close();
                }, 30);
              },
            }),
            { status: 200 },
          );
        }
        throw new Error(`Unexpected URL: ${url}`);
      },
    ) as unknown as typeof fetch;

    const proxied = await openCurseForgeProxyFile(123, 456, {
      fetchImpl,
      curseForgeApiKey: "curse-api-key-that-is-long-enough",
      proxyHeadersTimeoutMs: 5,
    });
    expect(new Uint8Array(await proxied.response.arrayBuffer())).toEqual(bytes);
  });

  it("exige l’origine canonique en production pour le proxy CurseForge", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    let failure: unknown;
    try {
      createCurseForgeProxyUrl(123, 456);
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ code: "APP_ORIGIN_NOT_CONFIGURED" });
  });

  it("signe les couples projet/fichier sans rendre les jetons interchangeables", () => {
    const secret = "catalog-secret-that-is-at-least-32-chars";
    const token = createCurseForgeDownloadToken(123, 456, secret);
    expect(verifyCurseForgeDownloadToken(123, 456, token, secret)).toBe(true);
    expect(verifyCurseForgeDownloadToken(123, 457, token, secret)).toBe(false);
  });
});

function createModrinthResolverFetch(
  bytes: Uint8Array,
  inspect?: (url: URL) => void,
  dependencies: Array<{
    project_id: string | null;
    version_id: string | null;
    dependency_type: "required" | "optional" | "incompatible" | "embedded";
  }> = [],
  downloadUrl = "https://cdn.modrinth.com/data/AABBCCDD/versions/VERSION1/content.jar",
  dependencyTypes: Record<string, "mod" | "resourcepack" | "shader"> = {
    Required1: "mod",
  },
  projectType: "mod" | "resourcepack" | "shader" = "mod",
): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = requestUrl(input);
    inspect?.(url);
    if (url.hostname === "cdn.modrinth.com") return binaryResponse(bytes);
    const pinnedVersionId = url.pathname.match(/^\/v2\/version\/([^/]+)$/)?.[1];
    if (pinnedVersionId) {
      const dependency = dependencies.find(
        (entry) => entry.version_id === pinnedVersionId,
      );
      if (dependency) {
        return jsonResponse(
          modrinthVersion({
            id: pinnedVersionId,
            projectId: dependency.project_id ?? "Required1",
            bytes,
            fileName: "dependency.jar",
            published: "2026-07-01T12:00:00.000Z",
          }),
        );
      }
    }
    const dependencyId = url.pathname.match(/^\/v2\/project\/([^/]+)$/)?.[1];
    if (dependencyId && dependencyTypes[dependencyId]) {
      return jsonResponse({
        id: dependencyId,
        slug: dependencyId.toLowerCase(),
        title: dependencyId,
        description: "Required dependency",
        project_type: dependencyTypes[dependencyId],
      });
    }
    if (url.pathname === "/v2/project/AABBCCDD") {
      return jsonResponse({
        id: "AABBCCDD",
        slug: "content",
        title: "Verified content",
        description: "Compatible content",
        project_type: projectType,
        icon_url: "https://cdn.modrinth.com/data/AABBCCDD/icon.png",
      });
    }
    if (url.pathname === "/v2/project/AABBCCDD/version") {
      const kind = url.searchParams.has("loaders") ? "mod" : "resourcepack";
      const fileName = kind === "mod" ? "content.jar" : "content.zip";
      const actualDownloadUrl = downloadUrl.replace(/content\.jar$/, fileName);
      return jsonResponse([
        {
          id: "VERSION1",
          project_id: "AABBCCDD",
          version_number: "1.0.0",
          version_type: "release",
          date_published: "2026-08-01T12:00:00.000Z",
          status: "listed",
          dependencies,
          files: [
            {
              hashes: {
                sha512: createHash("sha512").update(bytes).digest("hex"),
                sha1: createHash("sha1").update(bytes).digest("hex"),
              },
              url: actualDownloadUrl,
              filename: fileName,
              primary: true,
              size: bytes.byteLength,
            },
          ],
        },
      ]);
    }
    throw new Error(`Unexpected URL: ${url}`);
  }) as unknown as typeof fetch;
}

function modrinthVersion(input: {
  id: string;
  projectId: string;
  bytes: Uint8Array;
  fileName: string;
  published: string;
}) {
  return {
    id: input.id,
    project_id: input.projectId,
    version_number: input.id,
    version_type: "release",
    date_published: input.published,
    status: "listed",
    dependencies: [],
    files: [
      {
        hashes: {
          sha512: createHash("sha512").update(input.bytes).digest("hex"),
          sha1: createHash("sha1").update(input.bytes).digest("hex"),
        },
        url: `https://cdn.modrinth.com/data/${input.projectId}/versions/${input.id}/${input.fileName}`,
        filename: input.fileName,
        primary: true,
        size: input.bytes.byteLength,
      },
    ],
  };
}

function curseForgeProject() {
  return {
    id: 123,
    name: "Curse content",
    slug: "curse-content",
    summary: "A compatible project",
    classId: 6,
    downloadCount: 42,
    allowModDistribution: true,
    authors: [{ name: "Author" }],
    logo: {
      thumbnailUrl: "https://media.forgecdn.net/avatars/1/1.png",
    },
  };
}

function curseForgeFile(
  bytes: Uint8Array,
  dependencies: Array<{ modId: number; relationType: number }> = [],
) {
  return {
    id: 456,
    modId: 123,
    isAvailable: true,
    displayName: "Release 1.0",
    fileName: "curse-content.jar",
    releaseType: 1,
    fileDate: "2026-08-01T12:00:00.000Z",
    fileLength: bytes.byteLength,
    downloadUrl: "https://edge.forgecdn.net/files/1234/567/curse-content.jar",
    gameVersions: ["1.21.1", "Fabric"],
    dependencies,
    hashes: [
      { value: createHash("sha1").update(bytes).digest("hex"), algo: 1 },
    ],
  };
}

function createCurseForgeResolverFetch(
  bytes: Uint8Array,
  dependencies: Array<{ modId: number; relationType: number }> = [],
  dependencyClasses: Record<number, number> = {},
): typeof fetch {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = requestUrl(input);
    const headers = new Headers(init?.headers);
    expect(headers.get("x-api-key")).toBe("curse-api-key-that-is-long-enough");
    if (url.pathname === "/v1/mods/123") {
      return jsonResponse({ data: curseForgeProject() });
    }
    const dependencyId = Number(
      url.pathname.match(/^\/v1\/mods\/(\d+)$/)?.[1] ?? 0,
    );
    if (dependencyId && dependencyClasses[dependencyId]) {
      return jsonResponse({
        data: {
          ...curseForgeProject(),
          id: dependencyId,
          classId: dependencyClasses[dependencyId],
        },
      });
    }
    if (url.pathname === "/v1/mods/123/files") {
      return jsonResponse({ data: [curseForgeFile(bytes, dependencies)] });
    }
    if (url.hostname === "edge.forgecdn.net") return binaryResponse(bytes);
    throw new Error(`Unexpected URL: ${url}`);
  }) as unknown as typeof fetch;
}

function createCurseForgeProxyFetch(bytes: Uint8Array): typeof fetch {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = requestUrl(input);
    const headers = new Headers(init?.headers);
    expect(headers.get("x-api-key")).toBe("curse-api-key-that-is-long-enough");
    if (url.pathname === "/v1/mods/123") {
      return jsonResponse({ data: curseForgeProject() });
    }
    if (url.pathname === "/v1/mods/123/files/456") {
      return jsonResponse({ data: curseForgeFile(bytes) });
    }
    if (url.hostname === "edge.forgecdn.net") return binaryResponse(bytes);
    throw new Error(`Unexpected URL: ${url}`);
  }) as unknown as typeof fetch;
}
