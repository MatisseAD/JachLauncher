import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  DownloadableFileSchema,
  ModLoaderSchema,
  SafeFileNameSchema,
  VersionIdSchema,
  type DownloadableFile,
  type ModLoader,
} from "@jach/shared";
import { z } from "zod";
import webPackage from "../../package.json";

const MODRINTH_API_ORIGIN = "https://api.modrinth.com";
const CURSEFORGE_API_ORIGIN = "https://api.curseforge.com";
const MINECRAFT_GAME_ID = 432;

const JSON_TIMEOUT_MS = 8_000;
const FILE_TIMEOUT_MS = 45_000;
const PROXY_HEADERS_TIMEOUT_MS = 10_000;
const MAX_JSON_BYTES = 1 * 1024 * 1024;
export const MAX_CATALOG_FILE_BYTES = 512 * 1024 * 1024;

const SEARCH_CACHE_TTL_MS = 2 * 60_000;
const RESOLVE_CACHE_TTL_MS = 30 * 60_000;
const MAX_CACHE_ENTRIES = 250;

export const CatalogProviderSchema = z.enum(["modrinth", "curseforge"]);
export type CatalogProvider = z.infer<typeof CatalogProviderSchema>;

export const CatalogContentKindSchema = z.enum([
  "mod",
  "resourcepack",
  "shaderpack",
]);
export type CatalogContentKind = z.infer<typeof CatalogContentKindSchema>;

export const CatalogSearchInputSchema = z
  .object({
    provider: CatalogProviderSchema,
    kind: CatalogContentKindSchema,
    query: z.string().trim().min(2).max(64),
    minecraftVersion: VersionIdSchema,
    loader: ModLoaderSchema,
    limit: z.coerce.number().int().min(1).max(20).default(12),
  })
  .strict()
  .superRefine(validateModLoader);
export type CatalogSearchInput = z.infer<typeof CatalogSearchInputSchema>;

export const CatalogResolveInputSchema = z
  .object({
    provider: CatalogProviderSchema,
    kind: CatalogContentKindSchema,
    projectId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, "Identifiant de projet invalide"),
    versionId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, "Identifiant de version invalide")
      .optional(),
    minecraftVersion: VersionIdSchema,
    loader: ModLoaderSchema,
  })
  .strict()
  .superRefine(validateModLoader);
export type CatalogResolveInput = z.infer<typeof CatalogResolveInputSchema>;

export interface CatalogSearchResult {
  provider: CatalogProvider;
  projectId: string;
  title: string;
  description: string;
  author: string;
  downloads: number;
  projectUrl: string;
  iconUrl?: string;
  license?: string;
  installable: boolean;
}

export interface CatalogDependency {
  provider: CatalogProvider;
  projectId: string;
  kind: CatalogContentKind;
  /** Version exacte exigée par le fournisseur, lorsqu'elle est épinglée. */
  versionId?: string;
}

export interface CatalogResolution {
  file: DownloadableFile;
  requiredDependencies: CatalogDependency[];
}

export interface CatalogOptions {
  fetchImpl?: typeof fetch;
  curseForgeApiKey?: string | null;
  proxyHeadersTimeoutMs?: number;
}

export class CatalogError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const searchCache = new Map<string, CacheEntry<CatalogSearchResult[]>>();
const resolveCache = new Map<string, CacheEntry<CatalogResolution>>();
const inFlightResolutions = new Map<string, Promise<CatalogResolution>>();

const ModrinthSearchResponseSchema = z.object({
  hits: z.array(
    z.object({
      project_id: z.string().min(1).max(64),
      project_type: z.string().min(1).max(40),
      slug: z.string().min(1).max(100),
      title: z.string().min(1).max(200),
      description: z.string().max(2_000).default(""),
      author: z.string().max(100).default(""),
      downloads: z.number().int().nonnegative().default(0),
      icon_url: z.string().url().nullable().optional(),
      license: z.string().max(100).nullable().optional(),
    }),
  ),
});

const ModrinthProjectSchema = z.object({
  id: z.string().min(1).max(64),
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(2_000).default(""),
  icon_url: z.string().url().nullable().optional(),
  project_type: z.string().min(1).max(40),
});

const ModrinthVersionSchema = z.object({
  id: z.string().min(1).max(64),
  project_id: z.string().min(1).max(64),
  version_number: z.string().min(1).max(100),
  version_type: z.enum(["release", "beta", "alpha"]),
  date_published: z.string().datetime(),
  status: z
    .enum(["listed", "archived", "draft", "unlisted", "scheduled", "unknown"])
    .optional(),
  dependencies: z
    .array(
      z.object({
        version_id: z.string().min(1).max(64).nullable().optional(),
        project_id: z.string().min(1).max(64).nullable().optional(),
        dependency_type: z.enum([
          "required",
          "optional",
          "incompatible",
          "embedded",
        ]),
      }),
    )
    .max(100)
    .default([]),
  files: z.array(
    z.object({
      hashes: z.object({
        sha512: z.string().regex(/^[0-9a-f]{128}$/i),
        sha1: z.string().regex(/^[0-9a-f]{40}$/i),
      }),
      url: z.string().url(),
      filename: z.string().min(1).max(180),
      primary: z.boolean().default(false),
      size: z.number().int().positive(),
    }),
  ),
});

const ModrinthVersionsSchema = z.array(ModrinthVersionSchema).max(5_000);

const CurseForgeProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  summary: z.string().max(2_000).default(""),
  classId: z.number().int().positive(),
  downloadCount: z.number().nonnegative().default(0),
  allowModDistribution: z.boolean().nullable().optional(),
  authors: z
    .array(z.object({ name: z.string().max(100) }))
    .max(50)
    .default([]),
  logo: z
    .object({ thumbnailUrl: z.string().url().nullable().optional() })
    .nullable()
    .optional(),
});

const CurseForgeSearchResponseSchema = z.object({
  data: z.array(CurseForgeProjectSchema).max(50),
});

const CurseForgeProjectResponseSchema = z.object({
  data: CurseForgeProjectSchema,
});

const CurseForgeFileSchema = z.object({
  id: z.number().int().positive(),
  modId: z.number().int().positive(),
  isAvailable: z.boolean(),
  displayName: z.string().min(1).max(200),
  fileName: z.string().min(1).max(180),
  releaseType: z.number().int().min(1).max(3),
  fileDate: z.string().datetime(),
  fileLength: z.number().int().positive(),
  downloadUrl: z.string().url().nullable().optional(),
  gameVersions: z.array(z.string().max(100)).max(100).default([]),
  hashes: z
    .array(
      z.object({
        value: z.string().min(16).max(128),
        algo: z.number().int().min(1).max(2),
      }),
    )
    .max(5)
    .default([]),
  dependencies: z
    .array(
      z.object({
        modId: z.number().int().positive(),
        relationType: z.number().int().min(1).max(6),
      }),
    )
    .max(100)
    .default([]),
});

const CurseForgeFilesResponseSchema = z.object({
  data: z.array(CurseForgeFileSchema).max(50),
});

const CURSEFORGE_CLASS_IDS: Record<CatalogContentKind, number> = {
  mod: 6,
  resourcepack: 12,
  shaderpack: 6552,
};

const CURSEFORGE_LOADER_IDS: Partial<Record<ModLoader, number>> = {
  forge: 1,
  fabric: 4,
  quilt: 5,
  neoforge: 6,
};

export function isCurseForgeConfigured(
  apiKey = process.env.CURSEFORGE_API_KEY,
): boolean {
  return typeof apiKey === "string" && apiKey.trim().length >= 16;
}

export function isCurseForgeCatalogReady(): boolean {
  if (!isCurseForgeConfigured()) return false;
  try {
    createCurseForgeProxyUrl(1, 1);
    return true;
  } catch {
    return false;
  }
}

export async function searchCatalog(
  rawInput: CatalogSearchInput,
  options: CatalogOptions = {},
): Promise<CatalogSearchResult[]> {
  const input = CatalogSearchInputSchema.parse(rawInput);
  const cacheKey = JSON.stringify(input);
  if (input.provider === "modrinth") {
    const cached = readCache(searchCache, cacheKey);
    if (cached) return cached;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const results =
    input.provider === "modrinth"
      ? await searchModrinth(input, fetchImpl)
      : await searchCurseForge(
          input,
          fetchImpl,
          resolveCurseForgeApiKey(options),
        );

  if (input.provider === "modrinth") {
    writeCache(searchCache, cacheKey, results, SEARCH_CACHE_TTL_MS);
  }
  return results;
}

export async function resolveCatalogItem(
  rawInput: CatalogResolveInput,
  options: CatalogOptions = {},
): Promise<CatalogResolution> {
  const input = CatalogResolveInputSchema.parse(rawInput);
  if (input.provider === "curseforge") {
    const resolution = await resolveCurseForge(
      input,
      options.fetchImpl ?? fetch,
      resolveCurseForgeApiKey(options),
    );
    return {
      file: DownloadableFileSchema.parse(resolution.file),
      requiredDependencies: resolution.requiredDependencies,
    };
  }
  const cacheKey = JSON.stringify(input);
  const cached = readCache(resolveCache, cacheKey);
  if (cached) return cached;

  const pending = inFlightResolutions.get(cacheKey);
  if (pending) return pending;

  const fetchImpl = options.fetchImpl ?? fetch;
  const resolution = resolveModrinth(input, fetchImpl)
    .then((file) => {
      const validated = {
        file: DownloadableFileSchema.parse(file.file),
        requiredDependencies: file.requiredDependencies,
      } satisfies CatalogResolution;
      writeCache(resolveCache, cacheKey, validated, RESOLVE_CACHE_TTL_MS);
      return validated;
    })
    .finally(() => {
      inFlightResolutions.delete(cacheKey);
    });

  inFlightResolutions.set(cacheKey, resolution);
  return resolution;
}

async function searchModrinth(
  input: CatalogSearchInput,
  fetchImpl: typeof fetch,
): Promise<CatalogSearchResult[]> {
  const facets = [
    [`project_type:${modrinthProjectType(input.kind)}`],
    [`versions:${input.minecraftVersion}`],
  ];
  if (input.kind === "mod" && input.loader !== "vanilla") {
    facets.push([`categories:${input.loader}`]);
  }

  const url = new URL("/v2/search", MODRINTH_API_ORIGIN);
  url.searchParams.set("query", input.query);
  url.searchParams.set("facets", JSON.stringify(facets));
  url.searchParams.set("index", "relevance");
  url.searchParams.set("limit", String(input.limit));

  const response = ModrinthSearchResponseSchema.parse(
    await fetchJson(url, fetchImpl, modrinthHeaders()),
  );

  return response.hits
    .filter((hit) => hit.project_type === modrinthProjectType(input.kind))
    .map((hit) => ({
      provider: "modrinth" as const,
      projectId: hit.project_id,
      title: truncate(hit.title, 120),
      description: truncate(hit.description, 280),
      author: truncate(hit.author, 80),
      downloads: hit.downloads,
      projectUrl: modrinthProjectUrl(input.kind, hit.slug),
      iconUrl: safeDisplayUrl(hit.icon_url, "modrinth"),
      license: hit.license ?? undefined,
      installable: true,
    }));
}

async function resolveModrinth(
  input: CatalogResolveInput,
  fetchImpl: typeof fetch,
): Promise<CatalogResolution> {
  const projectUrl = new URL(
    `/v2/project/${encodeURIComponent(input.projectId)}`,
    MODRINTH_API_ORIGIN,
  );
  const versionsUrl = new URL(
    `/v2/project/${encodeURIComponent(input.projectId)}/version`,
    MODRINTH_API_ORIGIN,
  );
  versionsUrl.searchParams.set(
    "game_versions",
    JSON.stringify([input.minecraftVersion]),
  );
  if (input.kind === "mod") {
    versionsUrl.searchParams.set("loaders", JSON.stringify([input.loader]));
  }

  const [projectBody, versionsBody] = await Promise.all([
    fetchJson(projectUrl, fetchImpl, modrinthHeaders()),
    fetchJson(versionsUrl, fetchImpl, modrinthHeaders()),
  ]);
  const project = ModrinthProjectSchema.parse(projectBody);
  if (
    project.id !== input.projectId ||
    project.project_type !== modrinthProjectType(input.kind)
  ) {
    throw new CatalogError(
      "UPSTREAM_MISMATCH",
      502,
      "Le catalogue a renvoyé un projet incohérent.",
    );
  }

  const versions = ModrinthVersionsSchema.parse(versionsBody)
    .filter(
      (version) =>
        version.project_id === input.projectId &&
        version.status !== "draft" &&
        version.status !== "scheduled",
    )
    .sort(compareModrinthVersions);
  const selected = selectModrinthFile(versions, input.kind, input.versionId);
  if (!selected) {
    throw new CatalogError(
      "NO_COMPATIBLE_FILE",
      404,
      "Aucun fichier compatible n’est disponible pour cette configuration.",
    );
  }
  assertCatalogFileSize(selected.file.size);
  const hash = await hashRemoteFile(
    selected.file.url,
    "modrinth",
    selected.file.size,
    fetchImpl,
    { expectedHashes: { sha512: selected.file.hashes.sha512 } },
  );

  return {
    file: {
      id: safeCatalogId("modrinth", project.id, selected.version.id),
      name: truncate(project.title, 120),
      fileName: selected.file.filename,
      url: selected.file.url,
      sha256: hash.sha256,
      size: hash.size,
      source: "modrinth",
      required: true,
      iconUrl: safeDisplayUrl(project.icon_url, "modrinth"),
      description: truncate(project.description, 280),
      version: truncate(selected.version.version_number, 80),
    },
    requiredDependencies: await resolveModrinthDependencyIds(
      selected.version.dependencies,
      fetchImpl,
    ),
  };
}

async function searchCurseForge(
  input: CatalogSearchInput,
  fetchImpl: typeof fetch,
  apiKey: string | null,
): Promise<CatalogSearchResult[]> {
  assertCurseForgeAvailable(apiKey);
  const url = new URL("/v1/mods/search", CURSEFORGE_API_ORIGIN);
  url.searchParams.set("gameId", String(MINECRAFT_GAME_ID));
  url.searchParams.set("classId", String(CURSEFORGE_CLASS_IDS[input.kind]));
  url.searchParams.set("gameVersion", input.minecraftVersion);
  url.searchParams.set("searchFilter", input.query);
  url.searchParams.set("sortField", "2");
  url.searchParams.set("sortOrder", "desc");
  url.searchParams.set("pageSize", String(input.limit));
  const loaderId = curseForgeLoaderId(input.kind, input.loader);
  if (loaderId) url.searchParams.set("modLoaderType", String(loaderId));

  const response = CurseForgeSearchResponseSchema.parse(
    await fetchJson(url, fetchImpl, curseForgeHeaders(apiKey!)),
  );
  const expectedClass = CURSEFORGE_CLASS_IDS[input.kind];
  return response.data
    .filter((project) => project.classId === expectedClass)
    .map((project) => ({
      provider: "curseforge" as const,
      projectId: String(project.id),
      title: truncate(project.name, 120),
      description: truncate(project.summary, 280),
      author: truncate(project.authors[0]?.name ?? "", 80),
      downloads: Math.max(0, Math.floor(project.downloadCount)),
      projectUrl: curseForgeProjectUrl(input.kind, project.slug),
      iconUrl: safeDisplayUrl(project.logo?.thumbnailUrl, "curseforge"),
      license: "Voir la fiche officielle",
      installable: project.allowModDistribution !== false,
    }));
}

async function resolveCurseForge(
  input: CatalogResolveInput,
  fetchImpl: typeof fetch,
  apiKey: string | null,
): Promise<CatalogResolution> {
  assertCurseForgeAvailable(apiKey);
  if (!/^\d{1,12}$/.test(input.projectId)) {
    throw new CatalogError(
      "INVALID_PROJECT_ID",
      400,
      "Identifiant CurseForge invalide.",
    );
  }

  const projectId = Number(input.projectId);
  const projectUrl = new URL(`/v1/mods/${projectId}`, CURSEFORGE_API_ORIGIN);
  const filesUrl = new URL(
    `/v1/mods/${projectId}/files`,
    CURSEFORGE_API_ORIGIN,
  );
  filesUrl.searchParams.set("gameVersion", input.minecraftVersion);
  filesUrl.searchParams.set("pageSize", "50");
  const loaderId = curseForgeLoaderId(input.kind, input.loader);
  if (loaderId) filesUrl.searchParams.set("modLoaderType", String(loaderId));

  const [projectBody, filesBody] = await Promise.all([
    fetchJson(projectUrl, fetchImpl, curseForgeHeaders(apiKey!)),
    fetchJson(filesUrl, fetchImpl, curseForgeHeaders(apiKey!)),
  ]);
  const project = CurseForgeProjectResponseSchema.parse(projectBody).data;
  if (
    project.id !== projectId ||
    project.classId !== CURSEFORGE_CLASS_IDS[input.kind]
  ) {
    throw new CatalogError(
      "UPSTREAM_MISMATCH",
      502,
      "Le catalogue a renvoyé un projet incohérent.",
    );
  }
  if (project.allowModDistribution === false) {
    throw new CatalogError(
      "DISTRIBUTION_NOT_ALLOWED",
      403,
      "Ce projet n’autorise pas l’installation par un launcher tiers.",
    );
  }

  const files = CurseForgeFilesResponseSchema.parse(filesBody)
    .data.filter(
      (file) =>
        file.modId === projectId &&
        file.isAvailable &&
        file.downloadUrl &&
        file.gameVersions.includes(input.minecraftVersion) &&
        hasExpectedExtension(file.fileName, input.kind),
    )
    .sort(compareCurseForgeFiles);
  const file = files[0];
  if (!file?.downloadUrl) {
    throw new CatalogError(
      "NO_COMPATIBLE_FILE",
      404,
      "Aucun fichier compatible et distribuable n’est disponible.",
    );
  }
  assertCatalogFileSize(file.fileLength);
  const expectedSha1 = file.hashes.find((hash) => hash.algo === 1)?.value;
  const hash = await hashRemoteFile(
    file.downloadUrl,
    "curseforge",
    file.fileLength,
    fetchImpl,
    {
      expectedHashes:
        expectedSha1 && /^[0-9a-f]{40}$/i.test(expectedSha1)
          ? { sha1: expectedSha1 }
          : {},
      headers: curseForgeHeaders(apiKey!),
    },
  );

  return {
    file: {
      id: safeCatalogId("curseforge", input.projectId, String(file.id)),
      name: truncate(project.name, 120),
      fileName: file.fileName,
      url: createCurseForgeProxyUrl(projectId, file.id),
      sha256: hash.sha256,
      size: hash.size,
      source: "curseforge",
      required: true,
      iconUrl: safeDisplayUrl(project.logo?.thumbnailUrl, "curseforge"),
      description: truncate(project.summary, 280),
      version: truncate(file.displayName, 80),
    },
    requiredDependencies: await resolveCurseForgeRequiredDependencies(
      file.dependencies,
      fetchImpl,
      apiKey!,
    ),
  };
}

async function resolveCurseForgeRequiredDependencies(
  dependencies: z.infer<typeof CurseForgeFileSchema>["dependencies"],
  fetchImpl: typeof fetch,
  apiKey: string,
): Promise<CatalogDependency[]> {
  const requiredIds = [
    ...new Set(
      dependencies
        .filter((dependency) => dependency.relationType === 3)
        .map((dependency) => dependency.modId),
    ),
  ];
  if (requiredIds.length > 32) {
    throw new CatalogError(
      "TOO_MANY_DEPENDENCIES",
      422,
      "Ce projet contient trop de dépendances automatiques.",
    );
  }
  return Promise.all(
    requiredIds.map(async (projectId) => {
      const projectUrl = new URL(
        `/v1/mods/${projectId}`,
        CURSEFORGE_API_ORIGIN,
      );
      const project = CurseForgeProjectResponseSchema.parse(
        await fetchJson(projectUrl, fetchImpl, curseForgeHeaders(apiKey)),
      ).data;
      if (project.id !== projectId) {
        throw new CatalogError(
          "UPSTREAM_MISMATCH",
          502,
          "Une dépendance CurseForge est incohérente.",
        );
      }
      const kind = curseForgeContentKind(project.classId);
      return {
        provider: "curseforge" as const,
        projectId: String(projectId),
        kind,
      };
    }),
  );
}

function curseForgeContentKind(classId: number): CatalogContentKind {
  const entry = (
    Object.entries(CURSEFORGE_CLASS_IDS) as Array<[CatalogContentKind, number]>
  ).find(([, expectedClassId]) => expectedClassId === classId);
  if (!entry) {
    throw new CatalogError(
      "UNSUPPORTED_DEPENDENCY",
      422,
      "Ce projet dépend d'un type de contenu CurseForge que YourLauncher ne prend pas en charge.",
    );
  }
  return entry[0];
}

async function resolveModrinthDependencyIds(
  dependencies: z.infer<typeof ModrinthVersionSchema>["dependencies"],
  fetchImpl: typeof fetch,
): Promise<CatalogDependency[]> {
  const required = dependencies.filter(
    (dependency) => dependency.dependency_type === "required",
  );
  if (required.length > 32) {
    throw new CatalogError(
      "TOO_MANY_DEPENDENCIES",
      422,
      "Ce projet contient trop de dépendances automatiques.",
    );
  }

  const ids = new Set<string>();
  const resolvedDependencies: Array<{
    projectId: string;
    versionId?: string;
  }> = [];
  for (const dependency of required) {
    let projectId = dependency.project_id ?? null;
    const versionId = dependency.version_id ?? undefined;
    if (versionId) {
      const versionUrl = new URL(
        `/v2/version/${encodeURIComponent(versionId)}`,
        MODRINTH_API_ORIGIN,
      );
      const pinnedVersion = ModrinthVersionSchema.parse(
        await fetchJson(versionUrl, fetchImpl, modrinthHeaders()),
      );
      if (projectId && pinnedVersion.project_id !== projectId) {
        throw new CatalogError(
          "INVALID_DEPENDENCY",
          502,
          "Une dépendance requise référence une version incohérente.",
        );
      }
      projectId = pinnedVersion.project_id;
    }
    if (!projectId || !/^[a-zA-Z0-9_-]{1,64}$/.test(projectId)) {
      throw new CatalogError(
        "INVALID_DEPENDENCY",
        502,
        "Une dépendance requise n’a pas pu être identifiée.",
      );
    }
    const key = `${projectId}:${versionId ?? "latest"}`;
    if (!ids.has(key)) {
      ids.add(key);
      resolvedDependencies.push({
        projectId,
        ...(versionId ? { versionId } : {}),
      });
    }
  }

  return Promise.all(
    resolvedDependencies.map(async ({ projectId, versionId }) => {
      const projectUrl = new URL(
        `/v2/project/${encodeURIComponent(projectId)}`,
        MODRINTH_API_ORIGIN,
      );
      const project = ModrinthProjectSchema.parse(
        await fetchJson(projectUrl, fetchImpl, modrinthHeaders()),
      );
      if (project.id !== projectId) {
        throw new CatalogError(
          "UPSTREAM_MISMATCH",
          502,
          "Une dépendance Modrinth est incohérente.",
        );
      }
      const kind = modrinthDependencyKind(project.project_type);
      return {
        provider: "modrinth" as const,
        projectId,
        kind,
        ...(versionId ? { versionId } : {}),
      };
    }),
  );
}

function modrinthDependencyKind(projectType: string): CatalogContentKind {
  if (projectType === "mod") return "mod";
  if (projectType === "resourcepack") return "resourcepack";
  if (projectType === "shader") return "shaderpack";
  throw new CatalogError(
    "UNSUPPORTED_DEPENDENCY",
    422,
    "Ce projet dépend d’un type de contenu que YourLauncher ne prend pas en charge.",
  );
}

async function fetchJson(
  url: URL,
  fetchImpl: typeof fetch,
  headers: HeadersInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new CatalogError(
      "UPSTREAM_UNAVAILABLE",
      502,
      "Le fournisseur de contenu ne répond pas pour le moment.",
    );
  }
  if (!response.ok) {
    throw new CatalogError(
      "UPSTREAM_UNAVAILABLE",
      502,
      "Le fournisseur de contenu ne répond pas pour le moment.",
    );
  }
  const body = await readResponseBytes(response, MAX_JSON_BYTES);
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new CatalogError(
      "INVALID_UPSTREAM_RESPONSE",
      502,
      "Le fournisseur a renvoyé une réponse invalide.",
    );
  }
}

export function createCurseForgeDownloadToken(
  projectId: number,
  fileId: number,
  secret = contentCatalogSigningSecret(),
): string {
  return createHmac("sha256", secret)
    .update(`${projectId}:${fileId}`)
    .digest("base64url");
}

export function verifyCurseForgeDownloadToken(
  projectId: number,
  fileId: number,
  token: string,
  secret = contentCatalogSigningSecret(),
): boolean {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return false;
  const expected = createCurseForgeDownloadToken(projectId, fileId, secret);
  const receivedBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

export async function openCurseForgeProxyFile(
  projectId: number,
  fileId: number,
  options: CatalogOptions = {},
): Promise<{ response: Response; fileName: string; size: number }> {
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new CatalogError("INVALID_PROJECT_ID", 400, "Projet invalide.");
  }
  if (!Number.isSafeInteger(fileId) || fileId <= 0) {
    throw new CatalogError("INVALID_FILE_ID", 400, "Fichier invalide.");
  }
  const apiKey = resolveCurseForgeApiKey(options);
  assertCurseForgeAvailable(apiKey);
  const fetchImpl = options.fetchImpl ?? fetch;
  const metadataUrl = new URL(
    `/v1/mods/${projectId}/files/${fileId}`,
    CURSEFORGE_API_ORIGIN,
  );
  const projectUrl = new URL(`/v1/mods/${projectId}`, CURSEFORGE_API_ORIGIN);
  const [projectBody, metadataBody] = await Promise.all([
    fetchJson(projectUrl, fetchImpl, curseForgeHeaders(apiKey)),
    fetchJson(metadataUrl, fetchImpl, curseForgeHeaders(apiKey)),
  ]);
  const project = CurseForgeProjectResponseSchema.parse(projectBody).data;
  const metadata = CurseForgeFileSchema.parse(
    z.object({ data: CurseForgeFileSchema }).parse(metadataBody).data,
  );
  if (project.id !== projectId) {
    throw new CatalogError(
      "UPSTREAM_MISMATCH",
      502,
      "CurseForge a renvoyé un projet incohérent.",
    );
  }
  if (project.allowModDistribution === false) {
    throw new CatalogError(
      "DISTRIBUTION_NOT_ALLOWED",
      403,
      "Ce projet n’autorise plus la distribution par un launcher tiers.",
    );
  }
  if (
    metadata.modId !== projectId ||
    metadata.id !== fileId ||
    !metadata.isAvailable ||
    !metadata.downloadUrl
  ) {
    throw new CatalogError(
      "DOWNLOAD_UNAVAILABLE",
      404,
      "Ce fichier CurseForge n’est plus disponible.",
    );
  }
  const fileName = SafeFileNameSchema.parse(metadata.fileName);
  if (!/\.(?:jar|zip)$/i.test(fileName)) {
    throw new CatalogError(
      "INVALID_FILE_TYPE",
      415,
      "Ce type de fichier n’est pas pris en charge.",
    );
  }
  assertCatalogFileSize(metadata.fileLength);
  const response = await openTrustedFile(
    metadata.downloadUrl,
    "curseforge",
    fetchImpl,
    curseForgeHeaders(apiKey),
    {
      headersTimeoutMs:
        options.proxyHeadersTimeoutMs ?? PROXY_HEADERS_TIMEOUT_MS,
    },
  );
  const declaredLength = parseContentLength(
    response.headers.get("content-length"),
  );
  if (declaredLength !== null && declaredLength !== metadata.fileLength) {
    throw new CatalogError(
      "SIZE_MISMATCH",
      502,
      "La taille annoncée par CurseForge ne correspond pas au fichier.",
    );
  }
  const boundedResponse = new Response(
    boundDownloadStream(response.body!, metadata.fileLength),
    {
      status: response.status,
      headers: response.headers,
    },
  );
  return { response: boundedResponse, fileName, size: metadata.fileLength };
}

async function openTrustedFile(
  rawUrl: string,
  provider: CatalogProvider,
  fetchImpl: typeof fetch,
  additionalHeaders: HeadersInit | undefined,
  options: { bodySignal?: AbortSignal; headersTimeoutMs?: number } = {},
): Promise<Response> {
  let currentUrl = new URL(rawUrl);
  for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
    assertTrustedDownloadUrl(currentUrl, provider);
    const headers = new Headers(additionalHeaders);
    headers.set("User-Agent", catalogUserAgent());
    let response: Response;
    const headersController = new AbortController();
    const timeout = setTimeout(
      () => headersController.abort(),
      options.headersTimeoutMs ?? JSON_TIMEOUT_MS,
    );
    const requestSignal = options.bodySignal
      ? AbortSignal.any([options.bodySignal, headersController.signal])
      : headersController.signal;
    try {
      response = await fetchImpl(currentUrl, {
        method: "GET",
        headers,
        redirect: "manual",
        signal: requestSignal,
        cache: "no-store",
      });
    } catch {
      throw new CatalogError(
        "DOWNLOAD_UNAVAILABLE",
        502,
        "Le fichier sélectionné ne peut pas être vérifié.",
      );
    } finally {
      clearTimeout(timeout);
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.ok || !response.body) {
        throw new CatalogError(
          "DOWNLOAD_UNAVAILABLE",
          502,
          "Le fichier sélectionné ne peut pas être vérifié.",
        );
      }
      return response;
    }
    const location = response.headers.get("location");
    if (!location || redirectCount === 2) {
      throw new CatalogError(
        "UNSAFE_DOWNLOAD",
        502,
        "La redirection du téléchargement a été refusée.",
      );
    }
    await response.body?.cancel().catch(() => undefined);
    currentUrl = new URL(location, currentUrl);
  }
  throw new CatalogError(
    "UNSAFE_DOWNLOAD",
    502,
    "La redirection du téléchargement a été refusée.",
  );
}

async function hashRemoteFile(
  rawUrl: string,
  provider: CatalogProvider,
  expectedSize: number,
  fetchImpl: typeof fetch,
  options: {
    expectedHashes?: { sha512?: string; sha1?: string };
    headers?: HeadersInit;
  },
): Promise<{ sha256: string; size: number }> {
  const expectedHashes = options.expectedHashes ?? {};
  assertCatalogFileSize(expectedSize);
  const signal = AbortSignal.timeout(FILE_TIMEOUT_MS);
  const response = await openTrustedFile(
    rawUrl,
    provider,
    fetchImpl,
    options.headers,
    { bodySignal: signal },
  );

  if (!response?.ok || !response.body) {
    throw new CatalogError(
      "DOWNLOAD_UNAVAILABLE",
      502,
      "Le fichier sélectionné ne peut pas être vérifié.",
    );
  }
  const declaredLength = parseContentLength(
    response.headers.get("content-length"),
  );
  if (declaredLength !== null && declaredLength !== expectedSize) {
    throw new CatalogError(
      "SIZE_MISMATCH",
      502,
      "La taille annoncée par le fournisseur ne correspond pas au fichier.",
    );
  }

  const sha256 = createHash("sha256");
  const sha512 = expectedHashes.sha512 ? createHash("sha512") : null;
  const sha1 = expectedHashes.sha1 ? createHash("sha1") : null;
  const reader = response.body.getReader();
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > expectedSize || size > MAX_CATALOG_FILE_BYTES) {
        await reader.cancel();
        throw new CatalogError(
          "FILE_TOO_LARGE",
          413,
          "Le fichier dépasse la taille autorisée.",
        );
      }
      sha256.update(value);
      sha512?.update(value);
      sha1?.update(value);
    }
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    throw new CatalogError(
      "DOWNLOAD_UNAVAILABLE",
      502,
      "Le fichier sélectionné ne peut pas être vérifié.",
    );
  }
  if (size !== expectedSize) {
    throw new CatalogError(
      "SIZE_MISMATCH",
      502,
      "La taille annoncée par le fournisseur ne correspond pas au fichier.",
    );
  }
  if (
    expectedHashes.sha512 &&
    sha512?.digest("hex") !== expectedHashes.sha512.toLowerCase()
  ) {
    throw new CatalogError(
      "HASH_MISMATCH",
      502,
      "L’empreinte publiée par le fournisseur ne correspond pas au fichier.",
    );
  }
  if (
    expectedHashes.sha1 &&
    sha1?.digest("hex") !== expectedHashes.sha1.toLowerCase()
  ) {
    throw new CatalogError(
      "HASH_MISMATCH",
      502,
      "L’empreinte publiée par le fournisseur ne correspond pas au fichier.",
    );
  }
  return { sha256: sha256.digest("hex"), size };
}

async function readResponseBytes(
  response: Response,
  maximum: number,
): Promise<Uint8Array> {
  const declaredLength = parseContentLength(
    response.headers.get("content-length"),
  );
  if (declaredLength !== null && declaredLength > maximum) {
    throw new CatalogError(
      "UPSTREAM_RESPONSE_TOO_LARGE",
      502,
      "La réponse du fournisseur est trop volumineuse.",
    );
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel();
      throw new CatalogError(
        "UPSTREAM_RESPONSE_TOO_LARGE",
        502,
        "La réponse du fournisseur est trop volumineuse.",
      );
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function selectModrinthFile(
  versions: z.infer<typeof ModrinthVersionsSchema>,
  kind: CatalogContentKind,
  requestedVersionId?: string,
) {
  const candidatesForVersion = requestedVersionId
    ? versions.filter((version) => version.id === requestedVersionId)
    : versions;
  for (const version of candidatesForVersion) {
    const candidates = version.files.filter((file) =>
      hasExpectedExtension(file.filename, kind),
    );
    const file =
      candidates.find((candidate) => candidate.primary) ?? candidates[0];
    if (file) return { version, file };
  }
  return null;
}

function compareModrinthVersions(
  first: z.infer<typeof ModrinthVersionSchema>,
  second: z.infer<typeof ModrinthVersionSchema>,
): number {
  const releaseRank = { release: 0, beta: 1, alpha: 2 } as const;
  return (
    releaseRank[first.version_type] - releaseRank[second.version_type] ||
    Date.parse(second.date_published) - Date.parse(first.date_published)
  );
}

function compareCurseForgeFiles(
  first: z.infer<typeof CurseForgeFileSchema>,
  second: z.infer<typeof CurseForgeFileSchema>,
): number {
  return (
    first.releaseType - second.releaseType ||
    Date.parse(second.fileDate) - Date.parse(first.fileDate)
  );
}

function modrinthProjectType(kind: CatalogContentKind): string {
  if (kind === "shaderpack") return "shader";
  return kind;
}

function modrinthProjectUrl(kind: CatalogContentKind, slug: string): string {
  return `https://modrinth.com/${modrinthProjectType(kind)}/${encodeURIComponent(slug)}`;
}

function curseForgeProjectUrl(kind: CatalogContentKind, slug: string): string {
  const section =
    kind === "mod"
      ? "mc-mods"
      : kind === "resourcepack"
        ? "texture-packs"
        : "shaders";
  return `https://www.curseforge.com/minecraft/${section}/${encodeURIComponent(slug)}`;
}

function curseForgeLoaderId(
  kind: CatalogContentKind,
  loader: ModLoader,
): number | undefined {
  return kind === "mod" ? CURSEFORGE_LOADER_IDS[loader] : undefined;
}

function hasExpectedExtension(
  filename: string,
  kind: CatalogContentKind,
): boolean {
  const lower = filename.toLowerCase();
  return kind === "mod" ? lower.endsWith(".jar") : lower.endsWith(".zip");
}

function assertCatalogFileSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new CatalogError(
      "INVALID_FILE_SIZE",
      502,
      "Le fournisseur a renvoyé une taille de fichier invalide.",
    );
  }
  if (size > MAX_CATALOG_FILE_BYTES) {
    throw new CatalogError(
      "FILE_TOO_LARGE",
      413,
      "Ce fichier dépasse la limite de 512 Mio du catalogue.",
    );
  }
}

function assertTrustedDownloadUrl(url: URL, provider: CatalogProvider): void {
  const host = url.hostname.toLowerCase();
  const trusted =
    provider === "modrinth"
      ? host === "cdn.modrinth.com"
      : host === "forgecdn.net" || host.endsWith(".forgecdn.net");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !trusted
  ) {
    throw new CatalogError(
      "UNSAFE_DOWNLOAD",
      502,
      "L’URL de téléchargement fournie a été refusée.",
    );
  }
}

function safeDisplayUrl(
  rawUrl: string | null | undefined,
  provider: CatalogProvider,
): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    assertTrustedDownloadUrl(url, provider);
    return url.toString();
  } catch {
    return undefined;
  }
}

function safeCatalogId(
  provider: CatalogProvider,
  projectId: string,
  versionId: string,
): string {
  return `${provider}-${projectId}-${versionId}`.slice(0, 80);
}

function truncate(value: string, maximum: number): string {
  return value.trim().slice(0, maximum);
}

function parseContentLength(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function modrinthHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": catalogUserAgent(),
  };
}

function curseForgeHeaders(apiKey: string): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": catalogUserAgent(),
    "x-api-key": apiKey,
  };
}

function catalogUserAgent(): string {
  return `YourLauncher-Web/${webPackage.version} (https://yourlauncher.vercel.app)`;
}

export function createCurseForgeProxyUrl(
  projectId: number,
  fileId: number,
): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredOrigin && process.env.NODE_ENV === "production") {
    throw new CatalogError(
      "APP_ORIGIN_NOT_CONFIGURED",
      503,
      "L’origine publique du site doit être configurée.",
    );
  }
  let url: URL;
  try {
    url = new URL(
      `/api/content-catalog/download/curseforge/${projectId}/${fileId}`,
      configuredOrigin || "http://localhost:3000",
    );
  } catch {
    throw new CatalogError(
      "INVALID_APP_ORIGIN",
      500,
      "L’origine publique du site est invalide.",
    );
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new CatalogError(
      "INVALID_APP_ORIGIN",
      500,
      "L’origine publique du site doit utiliser HTTPS.",
    );
  }
  url.searchParams.set(
    "token",
    createCurseForgeDownloadToken(projectId, fileId),
  );
  return url.toString();
}

function contentCatalogSigningSecret(): string {
  const secret =
    process.env.CONTENT_CATALOG_SIGNING_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new CatalogError(
      "CATALOG_SIGNING_NOT_CONFIGURED",
      503,
      "Le proxy CurseForge n’est pas configuré sur ce serveur.",
    );
  }
  return secret;
}

function boundDownloadStream(
  source: ReadableStream<Uint8Array>,
  expectedSize: number,
): ReadableStream<Uint8Array> {
  let received = 0;
  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > expectedSize || received > MAX_CATALOG_FILE_BYTES) {
          controller.error(
            new CatalogError(
              "FILE_TOO_LARGE",
              413,
              "Le fichier dépasse la taille annoncée.",
            ),
          );
          return;
        }
        controller.enqueue(chunk);
      },
      flush(controller) {
        if (received !== expectedSize) {
          controller.error(
            new CatalogError(
              "SIZE_MISMATCH",
              502,
              "La taille du fichier ne correspond pas aux métadonnées.",
            ),
          );
        }
      },
    }),
  );
}

function resolveCurseForgeApiKey(options: CatalogOptions): string | null {
  if (Object.prototype.hasOwnProperty.call(options, "curseForgeApiKey")) {
    return options.curseForgeApiKey?.trim() || null;
  }
  return process.env.CURSEFORGE_API_KEY?.trim() || null;
}

function assertCurseForgeAvailable(
  apiKey: string | null,
): asserts apiKey is string {
  if (!isCurseForgeConfigured(apiKey ?? undefined)) {
    throw new CatalogError(
      "PROVIDER_DISABLED",
      503,
      "CurseForge n’est pas configuré sur ce serveur.",
    );
  }
}

function readCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function writeCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
): void {
  cache.delete(key);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

export function resetContentCatalogCachesForTests(): void {
  searchCache.clear();
  resolveCache.clear();
  inFlightResolutions.clear();
}

function validateModLoader(
  value: {
    kind: CatalogContentKind;
    loader: ModLoader;
    provider?: CatalogProvider;
    versionId?: string;
  },
  ctx: z.RefinementCtx,
): void {
  if (value.kind === "mod" && value.loader === "vanilla") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["loader"],
      message:
        "Choisis Fabric, Forge, NeoForge ou Quilt avant d’ajouter un mod.",
    });
  }
  if (value.versionId && value.provider !== "modrinth") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["versionId"],
      message: "Une version épinglée n'est acceptée que pour Modrinth.",
    });
  }
}
