"use client";

import { useEffect, useRef, useState } from "react";
import type { DownloadableFile, ModLoader } from "@jach/shared";
import {
  CATALOG_CONTENT_KINDS,
  groupResolvedContentByKind,
  type CatalogContentKind,
} from "@/lib/content-catalog-client";

type ContentKind = CatalogContentKind;
type Provider = "modrinth" | "curseforge";
/** Périmètre de recherche : les deux catalogues à la fois, ou un seul. */
type SearchScope = "all" | Provider;

interface CatalogResult {
  provider: Provider;
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

interface CatalogDependency {
  provider: Provider;
  projectId: string;
  kind: ContentKind;
  versionId?: string;
}

const KIND_COPY: Record<ContentKind, { label: string; search: string }> = {
  mod: { label: "Mods", search: "Ex. Sodium, JEI, Create…" },
  resourcepack: {
    label: "Packs de ressources",
    search: "Ex. Faithful, Fresh Animations…",
  },
  shaderpack: { label: "Shaders", search: "Ex. Complementary, BSL…" },
};

export default function ContentCatalogEditor({
  minecraftVersion,
  loader,
  items,
  onChange,
}: {
  minecraftVersion: string;
  loader: ModLoader;
  items: Record<ContentKind, DownloadableFile[]>;
  onChange: (kind: ContentKind, items: DownloadableFile[]) => void;
}) {
  const [kind, setKind] = useState<ContentKind>("mod");
  const [scope, setScope] = useState<SearchScope>("all");
  const [curseForgeAvailable, setCurseForgeAvailable] = useState(false);
  const [providerStatusLoaded, setProviderStatusLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const activeSearch = useRef<AbortController | null>(null);
  const activeResolution = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/content-catalog/status", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          providers?: { curseforge?: { available?: boolean } };
        } | null;
        if (!response.ok) return;
        setCurseForgeAvailable(Boolean(body?.providers?.curseforge?.available));
      })
      .finally(() => {
        if (!controller.signal.aborted) setProviderStatusLoaded(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    activeSearch.current?.abort();
    activeResolution.current?.abort();
    setResults([]);
    setSearchState("idle");
    setMessage("");
  }, [kind, scope, minecraftVersion, loader]);

  useEffect(
    () => () => {
      activeSearch.current?.abort();
      activeResolution.current?.abort();
    },
    [],
  );

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === "mod" && loader === "vanilla") {
      setSearchState("error");
      setMessage(
        "Choisis Fabric, Forge, NeoForge ou Quilt à l’étape Minecraft avant d’ajouter un mod.",
      );
      return;
    }
    const normalized = query.trim();
    if (normalized.length < 2) {
      setSearchState("error");
      setMessage("Saisis au moins 2 caractères.");
      return;
    }

    activeSearch.current?.abort();
    const controller = new AbortController();
    activeSearch.current = controller;
    setSearchState("loading");
    setMessage("");
    try {
      // « Tout » interroge les catalogues disponibles en parallèle : une panne
      // ou une absence de clé sur l'un n'empêche pas d'afficher l'autre.
      const providers: Provider[] =
        scope === "all"
          ? curseForgeAvailable
            ? ["modrinth", "curseforge"]
            : ["modrinth"]
          : [scope];

      const settled = await Promise.allSettled(
        providers.map(async (entry) => {
          const params = new URLSearchParams({
            provider: entry,
            kind,
            query: normalized,
            minecraftVersion,
            loader,
            limit: "12",
          });
          const response = await fetch(
            `/api/content-catalog/search?${params}`,
            { signal: controller.signal },
          );
          const body = (await response.json().catch(() => null)) as {
            results?: CatalogResult[];
            error?: string;
          } | null;
          if (!response.ok) {
            throw new Error(body?.error ?? "Recherche impossible.");
          }
          return body?.results ?? [];
        }),
      );

      const failures = settled.filter((entry) => entry.status === "rejected");
      if (failures.length === providers.length) {
        const reason = failures[0];
        throw reason.status === "rejected"
          ? (reason.reason as Error)
          : new Error("Recherche impossible.");
      }

      // Les plus téléchargés d'abord, toutes plateformes confondues.
      const next = settled
        .flatMap((entry) => (entry.status === "fulfilled" ? entry.value : []))
        .sort((a, b) => b.downloads - a.downloads);
      setResults(next);
      setSearchState("idle");
      setMessage(
        next.length === 0
          ? "Aucun résultat compatible. Vérifie la version et le loader."
          : "",
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearchState("error");
      setMessage(
        error instanceof Error ? error.message : "Recherche impossible.",
      );
    }
  }

  async function add(result: CatalogResult) {
    if (kind === "mod" && loader === "vanilla") {
      setMessage(
        "Choisis un mod loader à l’étape Minecraft avant d’ajouter un mod.",
      );
      return;
    }
    if (!result.installable) {
      setMessage(
        "Ce projet ne permet pas l’installation par un launcher tiers.",
      );
      return;
    }
    const resolutionKey = `${result.provider}:${result.projectId}`;
    activeResolution.current?.abort();
    const controller = new AbortController();
    activeResolution.current = controller;
    setResolvingId(resolutionKey);
    setMessage("");
    try {
      const queue: Array<{
        provider: Provider;
        kind: ContentKind;
        projectId: string;
        versionId?: string;
      }> = [{ provider: result.provider, kind, projectId: result.projectId }];
      const visited = new Set<string>();
      const resolved: Array<{ kind: ContentKind; file: DownloadableFile }> = [];

      while (queue.length > 0) {
        const next = queue.shift()!;
        const projectKey = `${next.provider}:${next.projectId}:${next.versionId ?? "latest"}`;
        if (visited.has(projectKey)) continue;
        visited.add(projectKey);
        if (visited.size > 33) {
          throw new Error(
            "Ce projet contient trop de dépendances automatiques.",
          );
        }

        const alreadyPresent = Object.values(items)
          .flat()
          .some((file) =>
            file.id.startsWith(`${next.provider}-${next.projectId}-`),
          );
        // Une dépendance Modrinth peut imposer une version précise. Dans ce
        // cas, on doit d'abord la résoudre afin de comparer son identifiant de
        // fichier exact; n'importe quelle version du même projet ne suffit pas.
        if (alreadyPresent && !next.versionId) continue;

        const response = await fetch("/api/content-catalog/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            provider: next.provider,
            kind: next.kind,
            projectId: next.projectId,
            ...(next.versionId ? { versionId: next.versionId } : {}),
            minecraftVersion,
            loader,
          }),
        });
        const body = (await response.json().catch(() => null)) as {
          file?: DownloadableFile;
          requiredDependencies?: CatalogDependency[];
          error?: string;
        } | null;
        if (!response.ok || !body?.file) {
          throw new Error(body?.error ?? "Ajout impossible.");
        }
        if (next.versionId) {
          const sameProject = [
            ...Object.values(items).flat(),
            ...resolved.map((entry) => entry.file),
          ].filter((file) =>
            file.id.startsWith(`${next.provider}-${next.projectId}-`),
          );
          if (sameProject.some((file) => file.id === body.file!.id)) continue;
          if (sameProject.length > 0) {
            throw new Error(
              "Une dépendance exige une autre version d'un contenu déjà ajouté. Retire l'ancienne version puis réessaie.",
            );
          }
        }
        resolved.push({ kind: next.kind, file: body.file });
        for (const dependency of body.requiredDependencies ?? []) {
          queue.push(dependency);
        }
      }

      const primary = resolved.find(
        (entry) =>
          entry.file.id.startsWith(`${result.provider}-${result.projectId}-`) &&
          entry.kind === kind,
      );
      if (!primary) {
        setMessage("Ce contenu est déjà présent dans le launcher.");
        return;
      }
      const duplicate = items[kind].some(
        (file) =>
          file.id === primary.file.id ||
          file.fileName.toLowerCase() === primary.file.fileName.toLowerCase(),
      );
      if (duplicate) {
        setMessage("Ce contenu est déjà présent dans le launcher.");
        return;
      }

      const additionsByKind = groupResolvedContentByKind(resolved);
      for (const targetKind of CATALOG_CONTENT_KINDS) {
        const additions = additionsByKind[targetKind];
        if (additions.length > 0) {
          onChange(targetKind, mergeUniqueFiles(items[targetKind], additions));
        }
      }
      const dependencyCount = Math.max(0, resolved.length - 1);
      setMessage(
        `${primary.file.name} a été vérifié et ajouté${
          dependencyCount > 0
            ? ` avec ${dependencyCount} dépendance${dependencyCount > 1 ? "s" : ""}`
            : ""
        }.`,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error ? error.message : "Ajout impossible.");
    } finally {
      if (activeResolution.current === controller) {
        activeResolution.current = null;
        setResolvingId(null);
      }
    }
  }

  const selected = items[kind];

  return (
    <div className="content-catalog">
      <div
        className="catalog-kind-tabs"
        role="tablist"
        aria-label="Type de contenu"
      >
        {(Object.keys(KIND_COPY) as ContentKind[]).map((entry) => (
          <button
            type="button"
            role="tab"
            aria-selected={kind === entry}
            className={kind === entry ? "active" : ""}
            key={entry}
            onClick={() => setKind(entry)}
          >
            {KIND_COPY[entry].label}
            <span>{items[entry].length}</span>
          </button>
        ))}
      </div>

      <div className="catalog-provider-row" aria-label="Source du catalogue">
        <button
          className={scope === "all" ? "active" : ""}
          type="button"
          onClick={() => setScope("all")}
        >
          Tout
          <small>
            {curseForgeAvailable ? "Modrinth + CurseForge" : "Modrinth"}
          </small>
        </button>
        <button
          className={scope === "modrinth" ? "active" : ""}
          type="button"
          onClick={() => setScope("modrinth")}
        >
          Modrinth
          <small>sans clé</small>
        </button>
        <button
          className={scope === "curseforge" ? "active" : ""}
          type="button"
          disabled={!providerStatusLoaded || !curseForgeAvailable}
          onClick={() => setScope("curseforge")}
        >
          CurseForge
          <small>
            {!providerStatusLoaded
              ? "vérification…"
              : curseForgeAvailable
                ? "disponible"
                : "non configuré"}
          </small>
        </button>
      </div>

      <form className="catalog-search" onSubmit={search}>
        <div className="field">
          <label htmlFor="catalog-query">
            Rechercher dans{" "}
            {scope === "all"
              ? curseForgeAvailable
                ? "Modrinth et CurseForge"
                : "Modrinth"
              : scope === "modrinth"
                ? "Modrinth"
                : "CurseForge"}
          </label>
          <div className="catalog-search-row">
            <input
              id="catalog-query"
              value={query}
              maxLength={64}
              placeholder={KIND_COPY[kind].search}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="btn"
              type="submit"
              disabled={
                searchState === "loading" ||
                (kind === "mod" && loader === "vanilla")
              }
            >
              {searchState === "loading" ? "Recherche…" : "Rechercher"}
            </button>
          </div>
          <div className="hint">
            {kind === "mod" && loader === "vanilla"
              ? "Sélectionne d’abord un mod loader à l’étape Minecraft."
              : `Compatibilité automatique : Minecraft ${minecraftVersion}${
                  kind === "mod" ? ` · ${loader}` : ""
                }.`}
          </div>
        </div>
      </form>

      {message && (
        <p
          className={
            searchState === "error"
              ? "catalog-message error"
              : "catalog-message"
          }
          role="status"
        >
          {message}
        </p>
      )}

      {results.length > 0 && (
        <div className="catalog-results" aria-label="Résultats du catalogue">
          {results.map((result) => {
            const key = `${result.provider}:${result.projectId}`;
            const alreadyAdded = selected.some((file) =>
              file.id.startsWith(`${result.provider}-${result.projectId}-`),
            );
            return (
              <article className="catalog-result" key={key}>
                <div className="catalog-result-icon" aria-hidden="true">
                  {result.title.slice(0, 1).toUpperCase()}
                </div>
                <div className="catalog-result-copy">
                  <div className="catalog-result-title">
                    <strong>{result.title}</strong>
                    <span>
                      {formatDownloads(result.downloads)} téléchargements
                    </span>
                  </div>
                  <p>{result.description || "Aucune description fournie."}</p>
                  <small>
                    {result.author ? `par ${result.author} · ` : ""}
                    {result.license ?? "Licence sur la fiche officielle"}
                  </small>
                  <a
                    href={result.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir la fiche officielle ↗
                  </a>
                </div>
                <button
                  className="btn secondary sm"
                  type="button"
                  disabled={
                    !result.installable || alreadyAdded || resolvingId !== null
                  }
                  onClick={() => void add(result)}
                >
                  {alreadyAdded
                    ? "Ajouté"
                    : resolvingId === key
                      ? "Vérification…"
                      : result.installable
                        ? "Ajouter"
                        : "Non distribuable"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <div className="catalog-selection">
        <div className="row spread">
          <strong>{KIND_COPY[kind].label} ajoutés</strong>
          <span className="pill">{selected.length}</span>
        </div>
        {selected.length === 0 ? (
          <p className="hint">
            Aucun contenu ajouté. Cette étape reste facultative.
          </p>
        ) : (
          <div className="catalog-selected-list">
            {selected.map((file) => (
              <div className="catalog-selected-item" key={file.id}>
                <div>
                  <strong>{file.name}</strong>
                  <small>
                    {sourceLabel(file.source)} · {formatBytes(file.size)}
                    {file.version ? ` · ${file.version}` : ""}
                  </small>
                </div>
                <button
                  className="icon-btn"
                  type="button"
                  title={`Retirer ${file.name}`}
                  onClick={() =>
                    onChange(
                      kind,
                      selected.filter((entry) => entry.id !== file.id),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function sourceLabel(source: DownloadableFile["source"]): string {
  if (source === "modrinth") return "Modrinth";
  if (source === "curseforge") return "CurseForge";
  return "Import manuel";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024)
    return `${Math.max(1, Math.round(bytes / 1024))} Kio`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mio`;
}

function formatDownloads(value: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(value);
}

function mergeUniqueFiles(
  current: DownloadableFile[],
  additions: DownloadableFile[],
): DownloadableFile[] {
  const result = [...current];
  for (const file of additions) {
    const duplicate = result.some(
      (entry) =>
        entry.id === file.id ||
        entry.fileName.toLowerCase() === file.fileName.toLowerCase(),
    );
    if (!duplicate) result.push(file);
  }
  return result;
}
