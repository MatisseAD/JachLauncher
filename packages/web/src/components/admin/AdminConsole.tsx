"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import UiIcon, { type UiIconName } from "@/components/UiIcon";
import AdminLivePanel from "./AdminLivePanel";
import styles from "./AdminConsole.module.css";

type UnknownRecord = Record<string, unknown>;
type Tab = "live" | "users" | "launchers" | "playerBans" | "audit";
type PaginatedTab = Exclude<Tab, "live">;

const ADMIN_REASON_MIN_LENGTH = 3;
const ADMIN_REASON_MAX_LENGTH = 500;

type MetricGroup = {
  users: {
    total: number | null;
    active: number | null;
    active30d: number | null;
    disabled: number | null;
    admins: number | null;
    new7d: number | null;
  };
  launchers: {
    total: number | null;
    published: number | null;
    ready: number | null;
    draft: number | null;
    suspended: number | null;
    new7d: number | null;
  };
  playerBans: { active: number | null; global: number | null };
  uploadsToday: { bytes: number | null; uploads: number | null };
  audit: { total: number | null };
};

type AdminUser = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  disabledAt: string | null;
  disabledReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  launcherCount: number | null;
};

type AdminLauncher = {
  id: string;
  slug: string;
  title: string;
  status: string;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  owner: {
    id: string;
    username: string;
    disabledAt: string | null;
  };
};

type PlayerBan = {
  id: string;
  scope: "global" | "launcher";
  launcher: { id: string; title: string; slug: string } | null;
  subjectType: "microsoft_uuid" | "offline_username";
  subjectValue: string;
  reason: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
  createdBy: { id: string; username: string } | null;
};

type AuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  createdAt: string | null;
  actor: { id: string; username: string } | null;
};

type Page<T> = { items: T[]; nextCursor: string | null };

type Overview = {
  generatedAt: string | null;
  metrics: MetricGroup;
  users: Page<AdminUser>;
  launchers: Page<AdminLauncher>;
  playerBans: Page<PlayerBan>;
  audit: Page<AuditEntry>;
};

type UserAction = "ban" | "unban" | "promote" | "demote";
type LauncherAction = "suspend" | "restore";

type BanDraft = {
  launcherId: string | null;
  subjectType: "microsoft_uuid" | "offline_username";
  subjectValue: string;
  reason: string;
  expiresAt: string | null;
};

type PendingOperation =
  | {
      kind: "user";
      id: string;
      action: UserAction;
      title: string;
      description: string;
      reasonRequired: boolean;
      danger: boolean;
      success: string;
    }
  | {
      kind: "launcher";
      id: string;
      action: LauncherAction;
      title: string;
      description: string;
      reasonRequired: boolean;
      danger: boolean;
      success: string;
    }
  | {
      kind: "revokeBan";
      id: string;
      title: string;
      description: string;
      reasonRequired: false;
      danger: false;
      success: string;
    }
  | {
      kind: "createBan";
      draft: BanDraft;
      title: string;
      description: string;
      reasonRequired: false;
      danger: true;
      success: string;
    };

type Feedback = { type: "success" | "error"; message: string };

const EMPTY_METRICS: MetricGroup = {
  users: {
    total: null,
    active: null,
    active30d: null,
    disabled: null,
    admins: null,
    new7d: null,
  },
  launchers: {
    total: null,
    published: null,
    ready: null,
    draft: null,
    suspended: null,
    new7d: null,
  },
  playerBans: { active: null, global: null },
  uploadsToday: { bytes: null, uploads: null },
  audit: { total: null },
};

const TAB_COPY: Array<{
  id: Tab;
  label: string;
  icon: UiIconName;
}> = [
  { id: "live", label: "En direct", icon: "activity" },
  { id: "users", label: "Membres", icon: "users" },
  { id: "launchers", label: "Launchers", icon: "server" },
  { id: "playerBans", label: "Interdictions", icon: "shield" },
  { id: "audit", label: "Journal d’audit", icon: "activity" },
];

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstText(...values: unknown[]): string | null {
  const result = values.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  return result?.trim() ?? null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function normalizePage<T>(
  value: unknown,
  legacyValue: unknown,
  normalize: (item: unknown, index: number) => T,
): Page<T> {
  const section = asRecord(value);
  const source = Array.isArray(value)
    ? value
    : asArray(section.items).length > 0
      ? asArray(section.items)
      : asArray(legacyValue);
  return {
    items: source.map(normalize),
    nextCursor: firstText(section.nextCursor),
  };
}

function normalizeUser(value: unknown, index: number): AdminUser {
  const row = asRecord(value);
  const count = asRecord(row._count);
  const id = firstText(row.id) ?? `user-${index}`;
  return {
    id,
    username: firstText(row.username, row.name) ?? "Membre sans nom",
    email: firstText(row.email) ?? "Adresse indisponible",
    avatarUrl: firstText(row.avatarUrl),
    role: firstText(row.role) ?? "USER",
    disabledAt: firstText(row.disabledAt, row.bannedAt),
    disabledReason: firstText(row.disabledReason, row.banReason),
    createdAt: firstText(row.createdAt),
    updatedAt: firstText(row.updatedAt),
    lastLoginAt: firstText(row.lastLoginAt),
    launcherCount: firstNumber(count.launchers, row.launcherCount),
  };
}

function normalizeLauncher(value: unknown, index: number): AdminLauncher {
  const row = asRecord(value);
  const owner = asRecord(row.owner);
  const id = firstText(row.id) ?? `launcher-${index}`;
  return {
    id,
    slug: firstText(row.slug) ?? "slug-indisponible",
    title: firstText(row.title, row.name) ?? "Launcher sans nom",
    status: firstText(row.status) ?? "unknown",
    suspendedAt: firstText(row.suspendedAt),
    suspensionReason: firstText(row.suspensionReason),
    createdAt: firstText(row.createdAt),
    updatedAt: firstText(row.updatedAt),
    owner: {
      id: firstText(owner.id, row.ownerId) ?? "",
      username:
        firstText(owner.username, owner.name, row.ownerUsername) ??
        "Propriétaire inconnu",
      disabledAt: firstText(owner.disabledAt),
    },
  };
}

function normalizeBan(value: unknown, index: number): PlayerBan {
  const row = asRecord(value);
  const launcher = asRecord(row.launcher);
  const createdBy = asRecord(row.createdBy);
  const launcherId = firstText(launcher.id, row.launcherId);
  const scope = firstText(row.scope) === "launcher" ? "launcher" : "global";
  const subjectType =
    firstText(row.subjectType) === "microsoft_uuid"
      ? "microsoft_uuid"
      : "offline_username";
  return {
    id: firstText(row.id) ?? `ban-${index}`,
    scope,
    launcher: launcherId
      ? {
          id: launcherId,
          title:
            firstText(launcher.title, launcher.name) ?? "Launcher sans nom",
          slug: firstText(launcher.slug) ?? "",
        }
      : null,
    subjectType,
    subjectValue:
      firstText(row.subjectValue, row.playerUuid, row.username) ??
      "Identifiant indisponible",
    reason: firstText(row.reason) ?? "Motif non renseigné",
    expiresAt: firstText(row.expiresAt),
    revokedAt: firstText(row.revokedAt),
    createdAt: firstText(row.createdAt),
    createdBy: firstText(createdBy.id, row.createdById)
      ? {
          id: firstText(createdBy.id, row.createdById) ?? "",
          username:
            firstText(createdBy.username, createdBy.name) ?? "Administrateur",
        }
      : null,
  };
}

function normalizeAudit(value: unknown, index: number): AuditEntry {
  const row = asRecord(value);
  const actor = asRecord(row.actor);
  return {
    id: firstText(row.id) ?? `audit-${index}`,
    action: firstText(row.action, row.type) ?? "ACTION_INCONNUE",
    targetType: firstText(row.targetType) ?? "ressource",
    targetId: firstText(row.targetId) ?? "—",
    metadata: row.metadata,
    createdAt: firstText(row.createdAt),
    actor: firstText(actor.id, row.actorId)
      ? {
          id: firstText(actor.id, row.actorId) ?? "",
          username: firstText(actor.username, actor.name) ?? "Administrateur",
        }
      : null,
  };
}

function normalizeOverview(value: unknown): Overview {
  const root = asRecord(value);
  const metrics = asRecord(root.metrics);
  const usersMetrics = asRecord(metrics.users);
  const launcherMetrics = asRecord(metrics.launchers);
  const banMetrics = asRecord(metrics.playerBans);
  const uploadMetrics = asRecord(metrics.uploadsToday);
  const auditMetrics = asRecord(metrics.audit);

  return {
    generatedAt: firstText(root.generatedAt),
    metrics: {
      users: {
        total: firstNumber(usersMetrics.total, metrics.totalUsers),
        active: firstNumber(usersMetrics.active, metrics.activeUsers),
        active30d: firstNumber(usersMetrics.active30d, metrics.activeUsers30d),
        disabled: firstNumber(usersMetrics.disabled, metrics.disabledUsers),
        admins: firstNumber(usersMetrics.admins, metrics.adminUsers),
        new7d: firstNumber(usersMetrics.new7d, metrics.newUsers7d),
      },
      launchers: {
        total: firstNumber(launcherMetrics.total, metrics.totalLaunchers),
        published: firstNumber(
          launcherMetrics.published,
          metrics.publishedLaunchers,
        ),
        ready: firstNumber(launcherMetrics.ready),
        draft: firstNumber(launcherMetrics.draft),
        suspended: firstNumber(
          launcherMetrics.suspended,
          metrics.suspendedLaunchers,
        ),
        new7d: firstNumber(launcherMetrics.new7d, metrics.newLaunchers7d),
      },
      playerBans: {
        active: firstNumber(banMetrics.active, metrics.activePlayerBans),
        global: firstNumber(banMetrics.global, metrics.globalPlayerBans),
      },
      uploadsToday: {
        bytes: firstNumber(uploadMetrics.bytes, metrics.uploadBytesToday),
        uploads: firstNumber(uploadMetrics.uploads, metrics.uploadsTodayCount),
      },
      audit: {
        total: firstNumber(auditMetrics.total, metrics.auditEvents),
      },
    },
    users: normalizePage(root.users, root.members, normalizeUser),
    launchers: normalizePage(root.launchers, root.projects, normalizeLauncher),
    playerBans: normalizePage(root.playerBans, root.bans, normalizeBan),
    audit: normalizePage(root.audit, root.auditLogs, normalizeAudit),
  };
}

function formatCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("fr-FR").format(value);
}

function formatBytes(value: number | null) {
  if (value === null) return "—";
  if (value === 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const exponent = Math.min(
    Math.floor(Math.log(Math.abs(value)) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** exponent;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(amount)} ${units[exponent]}`;
}

function formatDate(value: string | null, fallback = "Indisponible") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMetadata(value: unknown) {
  if (typeof value === "string") return value;
  const metadata = asRecord(value);
  const preferred = firstText(
    metadata.reason,
    metadata.message,
    metadata.description,
  );
  if (preferred) return preferred;
  const summary = Object.entries(metadata)
    .slice(0, 4)
    .map(([key, item]) => {
      const printable =
        typeof item === "string" || typeof item === "number"
          ? String(item)
          : JSON.stringify(item);
      return `${key}: ${printable}`;
    })
    .join(" · ");
  return summary || "Aucun détail supplémentaire";
}

function roleLabel(role: string) {
  const normalized = role.toUpperCase();
  if (normalized === "SUPER_ADMIN" || normalized === "OWNER")
    return "Super admin";
  if (normalized === "ADMIN") return "Administrateur";
  return "Membre";
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "published") return "Publié";
  if (normalized === "ready") return "Prêt";
  if (normalized === "draft") return "Brouillon";
  return status || "Inconnu";
}

function isActiveBan(ban: PlayerBan) {
  if (ban.revokedAt) return false;
  if (!ban.expiresAt) return true;
  const expiresAt = new Date(ban.expiresAt).getTime();
  return Number.isNaN(expiresAt) || expiresAt > Date.now();
}

async function responseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as unknown;
  const root = asRecord(payload);
  return (
    firstText(root.error, root.message) ??
    `La requête a échoué (${response.status}).`
  );
}

function mergeUnique<T extends { id: string }>(current: T[], incoming: T[]) {
  const rows = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => rows.set(item.id, item));
  return Array.from(rows.values());
}

export default function AdminConsole({
  adminName,
  adminId,
}: {
  adminName: string;
  adminId?: string | null;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState<PaginatedTab | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState<PendingOperation | null>(null);
  const [reason, setReason] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [banScope, setBanScope] = useState<"global" | "launcher">("global");
  const [banSubjectType, setBanSubjectType] =
    useState<BanDraft["subjectType"]>("offline_username");
  const [banSubjectValue, setBanSubjectValue] = useState("");
  const [banLauncherId, setBanLauncherId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banExpiresAt, setBanExpiresAt] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const overviewGenerationRef = useRef(0);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const fetchOverview = useCallback(
    async (
      search: string,
      cursor?: { name: string; value: string },
      signal?: AbortSignal,
    ) => {
      const params = new URLSearchParams({ limit: "25" });
      if (search) params.set("q", search);
      if (cursor) params.set(cursor.name, cursor.value);
      const response = await fetch(`/api/admin/overview?${params}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal,
      });
      if (!response.ok) throw new Error(await responseError(response));
      return normalizeOverview((await response.json()) as unknown);
    },
    [],
  );

  const invalidatePaginationRequests = useCallback(() => {
    overviewGenerationRef.current += 1;
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    setLoadingMore(null);
    return overviewGenerationRef.current;
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = searchInput.trim();
      if (nextQuery === query) return;
      // Invalide immédiatement la pagination avant même le prochain rendu :
      // une réponse déjà en file d'attente ne peut ainsi jamais être fusionnée
      // dans les résultats de la nouvelle recherche.
      invalidatePaginationRequests();
      setLoading(true);
      setQuery(nextQuery);
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [invalidatePaginationRequests, query, searchInput]);

  useEffect(() => {
    const generation = invalidatePaginationRequests();
    const controller = new AbortController();
    setLoading(true);
    setPageError(null);
    fetchOverview(query, undefined, controller.signal)
      .then((result) => {
        if (generation === overviewGenerationRef.current) setOverview(result);
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          generation !== overviewGenerationRef.current
        ) {
          return;
        }
        setPageError(
          error instanceof Error
            ? error.message
            : "Impossible de charger l’administration.",
        );
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          generation === overviewGenerationRef.current
        ) {
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
      loadMoreControllerRef.current?.abort();
    };
  }, [fetchOverview, invalidatePaginationRequests, query]);

  useEffect(() => {
    if (!pending) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => reasonRef.current?.focus(), 0);
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !mutating) setPending(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mutating, pending]);

  const metrics = overview?.metrics ?? EMPTY_METRICS;

  const tabCounts = useMemo(
    () => ({
      live: null,
      users: metrics.users.total,
      launchers: metrics.launchers.total,
      playerBans: metrics.playerBans.active,
      audit: metrics.audit.total,
    }),
    [metrics],
  );

  const metricCards = useMemo(
    () => [
      {
        label: "Membres inscrits",
        value: formatCount(metrics.users.total),
        detail:
          metrics.users.new7d === null
            ? "Nouveaux membres indisponibles"
            : `+${formatCount(metrics.users.new7d)} sur 7 jours`,
        icon: "users" as const,
        tone: "violet",
      },
      {
        label: "Actifs sur 30 jours",
        value: formatCount(metrics.users.active30d),
        detail:
          metrics.users.active === null
            ? "Comptes autorisés indisponibles"
            : `${formatCount(metrics.users.active)} compte(s) autorisé(s)`,
        icon: "activity" as const,
        tone: "green",
      },
      {
        label: "Administrateurs",
        value: formatCount(metrics.users.admins),
        detail: "Accès global à la plateforme",
        icon: "shield" as const,
        tone: "blue",
      },
      {
        label: "Launchers",
        value: formatCount(metrics.launchers.total),
        detail:
          metrics.launchers.new7d === null
            ? "Nouveaux launchers indisponibles"
            : `+${formatCount(metrics.launchers.new7d)} sur 7 jours`,
        icon: "server" as const,
        tone: "violet",
      },
      {
        label: "En production",
        value: formatCount(metrics.launchers.published),
        detail:
          metrics.launchers.draft === null
            ? "Brouillons indisponibles"
            : `${formatCount(metrics.launchers.draft)} brouillon(s)`,
        icon: "rocket" as const,
        tone: "green",
      },
      {
        label: "Launchers suspendus",
        value: formatCount(metrics.launchers.suspended),
        detail: "Contrôle appliqué côté serveur et client",
        icon: "layers" as const,
        tone: "amber",
      },
      {
        label: "Interdictions actives",
        value: formatCount(metrics.playerBans.active),
        detail:
          metrics.playerBans.global === null
            ? "Portée globale indisponible"
            : `${formatCount(metrics.playerBans.global)} globale(s)`,
        icon: "shield" as const,
        tone: "red",
      },
      {
        label: "Téléversements du jour",
        value: formatBytes(metrics.uploadsToday.bytes),
        detail:
          metrics.uploadsToday.uploads === null
            ? "Nombre d’envois indisponible"
            : `${formatCount(metrics.uploadsToday.uploads)} fichier(s)`,
        icon: "download" as const,
        tone: "blue",
      },
    ],
    [metrics],
  );

  const refreshOverview = useCallback(async () => {
    const generation = invalidatePaginationRequests();
    setRefreshing(true);
    setPageError(null);
    try {
      const result = await fetchOverview(query);
      if (generation === overviewGenerationRef.current) setOverview(result);
    } catch (error) {
      if (generation !== overviewGenerationRef.current) return true;
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d’actualiser la console.";
      setPageError(message);
      return false;
    } finally {
      if (generation === overviewGenerationRef.current) setLoading(false);
      setRefreshing(false);
    }
    return true;
  }, [fetchOverview, invalidatePaginationRequests, query]);

  async function loadMore(tab: PaginatedTab) {
    if (!overview || loading || loadingMore !== null) return;
    const cursor = overview[tab].nextCursor;
    if (!cursor) return;
    const cursorNames: Record<PaginatedTab, string> = {
      users: "userCursor",
      launchers: "launcherCursor",
      playerBans: "banCursor",
      audit: "auditCursor",
    };
    const generation = overviewGenerationRef.current;
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = controller;
    setLoadingMore(tab);
    setFeedback(null);
    try {
      const result = await fetchOverview(
        query,
        {
          name: cursorNames[tab],
          value: cursor,
        },
        controller.signal,
      );
      if (
        controller.signal.aborted ||
        generation !== overviewGenerationRef.current
      ) {
        return;
      }
      setOverview((current) => {
        if (generation !== overviewGenerationRef.current) return current;
        if (!current) return result;
        const base = {
          ...current,
          generatedAt: result.generatedAt ?? current.generatedAt,
        };
        if (tab === "users") {
          return {
            ...base,
            users: {
              items: mergeUnique(current.users.items, result.users.items),
              nextCursor: result.users.nextCursor,
            },
          };
        }
        if (tab === "launchers") {
          return {
            ...base,
            launchers: {
              items: mergeUnique(
                current.launchers.items,
                result.launchers.items,
              ),
              nextCursor: result.launchers.nextCursor,
            },
          };
        }
        if (tab === "playerBans") {
          return {
            ...base,
            playerBans: {
              items: mergeUnique(
                current.playerBans.items,
                result.playerBans.items,
              ),
              nextCursor: result.playerBans.nextCursor,
            },
          };
        }
        return {
          ...base,
          audit: {
            items: mergeUnique(current.audit.items, result.audit.items),
            nextCursor: result.audit.nextCursor,
          },
        };
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        generation !== overviewGenerationRef.current
      ) {
        return;
      }
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger la suite.",
      });
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        setLoadingMore(null);
      }
    }
  }

  function openOperation(operation: PendingOperation) {
    setFeedback(null);
    setOperationError(null);
    setReason("");
    setPending(operation);
  }

  async function requestMutation(
    endpoint: string,
    init: RequestInit,
  ): Promise<void> {
    const response = await fetch(endpoint, {
      ...init,
      credentials: "same-origin",
      headers:
        init.body === undefined
          ? init.headers
          : { "Content-Type": "application/json", ...init.headers },
    });
    if (!response.ok) throw new Error(await responseError(response));
  }

  async function confirmOperation() {
    if (!pending || mutating) return;
    const normalizedReason = reason.trim();
    if (
      pending.reasonRequired &&
      (normalizedReason.length < ADMIN_REASON_MIN_LENGTH ||
        normalizedReason.length > ADMIN_REASON_MAX_LENGTH)
    ) {
      setOperationError(
        `Le motif doit contenir entre ${ADMIN_REASON_MIN_LENGTH} et ${ADMIN_REASON_MAX_LENGTH} caractères.`,
      );
      reasonRef.current?.focus();
      return;
    }

    setMutating(true);
    setFeedback(null);
    setOperationError(null);
    try {
      if (pending.kind === "user") {
        await requestMutation(`/api/admin/users/${pending.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            action: pending.action,
            ...(normalizedReason ? { reason: normalizedReason } : {}),
          }),
        });
      } else if (pending.kind === "launcher") {
        await requestMutation(`/api/admin/launchers/${pending.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            action: pending.action,
            ...(normalizedReason ? { reason: normalizedReason } : {}),
          }),
        });
      } else if (pending.kind === "revokeBan") {
        await requestMutation(`/api/admin/player-bans/${pending.id}`, {
          method: "DELETE",
        });
      } else {
        await requestMutation("/api/admin/player-bans", {
          method: "POST",
          body: JSON.stringify(pending.draft),
        });
        setBanSubjectValue("");
        setBanReason("");
        setBanExpiresAt("");
      }

      const success = pending.success;
      setPending(null);
      setReason("");
      setOperationError(null);
      setFeedback({ type: "success", message: success });
      const refreshed = await refreshOverview();
      if (!refreshed) {
        setFeedback({
          type: "success",
          message: `${success} Actualisez la console pour voir les données à jour.`,
        });
      }
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "L’action administrative a échoué.",
      );
    } finally {
      setMutating(false);
    }
  }

  function submitPlayerBan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subjectValue = banSubjectValue.trim();
    const sanctionReason = banReason.trim();
    const launcherId = banScope === "launcher" ? banLauncherId.trim() : null;
    if (
      !subjectValue ||
      !sanctionReason ||
      (banScope === "launcher" && !launcherId)
    ) {
      setFeedback({
        type: "error",
        message: "Complétez l’identifiant, le motif et la portée du blocage.",
      });
      return;
    }
    if (
      sanctionReason.length < ADMIN_REASON_MIN_LENGTH ||
      sanctionReason.length > ADMIN_REASON_MAX_LENGTH
    ) {
      setFeedback({
        type: "error",
        message: `Le motif doit contenir entre ${ADMIN_REASON_MIN_LENGTH} et ${ADMIN_REASON_MAX_LENGTH} caractères.`,
      });
      return;
    }

    let expiresAt: string | null = null;
    if (banExpiresAt) {
      const expiration = new Date(banExpiresAt);
      if (
        Number.isNaN(expiration.getTime()) ||
        expiration.getTime() <= Date.now()
      ) {
        setFeedback({
          type: "error",
          message: "La date d’expiration doit être située dans le futur.",
        });
        return;
      }
      expiresAt = expiration.toISOString();
    }

    const draft: BanDraft = {
      launcherId,
      subjectType: banSubjectType,
      subjectValue,
      reason: sanctionReason,
      expiresAt,
    };
    openOperation({
      kind: "createBan",
      draft,
      title: "Confirmer l’interdiction joueur",
      description:
        banScope === "global"
          ? `${subjectValue} sera refusé lors de ses prochains lancements depuis les clients officiels de la plateforme.`
          : `${subjectValue} sera refusé lors de ses prochains lancements sur le launcher sélectionné.`,
      reasonRequired: false,
      danger: true,
      success: "L’interdiction joueur est active.",
    });
  }

  if (!overview && loading) {
    return <AdminLoading />;
  }

  if (!overview && pageError) {
    return (
      <section className={styles.statePanel} role="alert">
        <span className={styles.stateIcon}>
          <UiIcon name="shield" size={24} />
        </span>
        <h1>La console ne répond pas</h1>
        <p>{pageError}</p>
        <button
          className="btn secondary"
          onClick={() => void refreshOverview()}
        >
          Réessayer
        </button>
      </section>
    );
  }

  if (!overview) return null;

  return (
    <div className={styles.console}>
      <section className={`dashboard-heading ${styles.heading}`}>
        <div>
          <span className="page-kicker">Contrôle global</span>
          <h1>Centre d’administration</h1>
          <p>
            Bonjour {adminName}. Supervisez les membres, les launchers et les
            accès joueurs depuis un historique centralisé.
          </p>
        </div>
        <button
          className="btn secondary"
          type="button"
          onClick={() => void refreshOverview()}
          disabled={refreshing}
        >
          <UiIcon name="activity" size={17} />
          {refreshing ? "Actualisation…" : "Actualiser"}
        </button>
      </section>

      <div className={styles.snapshot}>
        <span>
          <i className={styles.liveDot} /> Données serveur
        </span>
        <span>
          Vue générée {formatDate(overview.generatedAt, "à l’instant")}
        </span>
        <span>{formatCount(metrics.audit.total)} événement(s) audité(s)</span>
      </div>

      <section className={styles.metricGrid} aria-label="Indicateurs globaux">
        {metricCards.map((card) => (
          <article className={styles.metricCard} key={card.label}>
            <span className={`${styles.metricIcon} ${styles[card.tone]}`}>
              <UiIcon name={card.icon} size={19} />
            </span>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </div>
          </article>
        ))}
      </section>

      {feedback ? (
        <div
          className={`${styles.feedback} ${styles[feedback.type]}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          <UiIcon
            name={feedback.type === "error" ? "shield" : "check"}
            size={17}
          />
          <span>{feedback.message}</span>
          <button
            type="button"
            aria-label="Fermer le message"
            onClick={() => setFeedback(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {pageError && overview ? (
        <div className={`${styles.feedback} ${styles.error}`} role="alert">
          <UiIcon name="shield" size={17} />
          <span>{pageError}</span>
        </div>
      ) : null}

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Administration"
          >
            {TAB_COPY.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`admin-panel-${tab.id}`}
                className={activeTab === tab.id ? styles.activeTab : undefined}
                onClick={() => setActiveTab(tab.id)}
              >
                <UiIcon name={tab.icon} size={16} />
                <span>{tab.label}</span>
                <small>{formatCount(tabCounts[tab.id])}</small>
              </button>
            ))}
          </div>

          <label className={styles.search}>
            <span className={styles.srOnly}>
              Rechercher dans l’administration
            </span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Membre, e-mail, launcher, identifiant…"
            />
            {loading ? <i aria-label="Recherche en cours" /> : null}
          </label>
        </div>

        {activeTab === "users" ? (
          <UsersPanel
            users={overview.users.items}
            adminId={adminId}
            query={query}
            onAction={openOperation}
          />
        ) : null}

        {activeTab === "live" ? <AdminLivePanel query={query} /> : null}

        {activeTab === "launchers" ? (
          <LaunchersPanel
            launchers={overview.launchers.items}
            query={query}
            onAction={openOperation}
          />
        ) : null}

        {activeTab === "playerBans" ? (
          <BansPanel
            bans={overview.playerBans.items}
            launchers={overview.launchers.items}
            query={query}
            scope={banScope}
            subjectType={banSubjectType}
            subjectValue={banSubjectValue}
            launcherId={banLauncherId}
            reason={banReason}
            expiresAt={banExpiresAt}
            onScopeChange={setBanScope}
            onSubjectTypeChange={setBanSubjectType}
            onSubjectValueChange={setBanSubjectValue}
            onLauncherIdChange={setBanLauncherId}
            onReasonChange={setBanReason}
            onExpiresAtChange={setBanExpiresAt}
            onSubmit={submitPlayerBan}
            onRevoke={openOperation}
          />
        ) : null}

        {activeTab === "audit" ? (
          <AuditPanel entries={overview.audit.items} query={query} />
        ) : null}

        {activeTab !== "live" && overview[activeTab].nextCursor ? (
          <div className={styles.loadMore}>
            <button
              className="btn secondary"
              type="button"
              disabled={loading || loadingMore !== null}
              onClick={() => void loadMore(activeTab)}
            >
              {loadingMore === activeTab ? "Chargement…" : "Afficher la suite"}
            </button>
          </div>
        ) : null}
      </section>

      {pending ? (
        <ConfirmationDialog
          operation={pending}
          reason={reason}
          error={operationError}
          reasonRef={reasonRef}
          mutating={mutating}
          onReasonChange={(value) => {
            setReason(value);
            setOperationError(null);
          }}
          onCancel={() => {
            setPending(null);
            setReason("");
            setOperationError(null);
          }}
          onConfirm={() => void confirmOperation()}
        />
      ) : null}
    </div>
  );
}

function UsersPanel({
  users,
  adminId,
  query,
  onAction,
}: {
  users: AdminUser[];
  adminId?: string | null;
  query: string;
  onAction: (operation: PendingOperation) => void;
}) {
  return (
    <div
      id="admin-panel-users"
      role="tabpanel"
      aria-label="Membres"
      className={styles.panel}
    >
      <PanelHeading
        eyebrow="Identités & accès"
        title="Tous les membres"
        description="La suspension d’un membre ferme également les launchers dont il est propriétaire."
        count={users.length}
      />
      {users.length === 0 ? (
        <EmptyState query={query} label="membre" />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Liste des membres YourLauncher
            </caption>
            <thead>
              <tr>
                <th scope="col">Membre</th>
                <th scope="col">Rôle</th>
                <th scope="col">Launchers</th>
                <th scope="col">État</th>
                <th scope="col">Activité</th>
                <th scope="col" className={styles.actionsHeading}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const normalizedRole = user.role.toUpperCase();
                const isAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER"].includes(
                  normalizedRole,
                );
                const isProtectedAdmin = ["SUPER_ADMIN", "OWNER"].includes(
                  normalizedRole,
                );
                const isSelf = Boolean(adminId && user.id === adminId);
                return (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.identity}>
                        <span className={styles.avatar}>
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" />
                          ) : (
                            user.username.charAt(0).toUpperCase()
                          )}
                        </span>
                        <span>
                          <strong>{user.username}</strong>
                          <small>{user.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${isAdmin ? styles.badgeAdmin : ""}`}
                      >
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td>{formatCount(user.launcherCount)}</td>
                    <td>
                      {user.disabledAt ? (
                        <span
                          className={`${styles.badge} ${styles.badgeDanger}`}
                          title={user.disabledReason ?? undefined}
                        >
                          Suspendu
                        </span>
                      ) : (
                        <span
                          className={`${styles.badge} ${styles.badgeSuccess}`}
                        >
                          Actif
                        </span>
                      )}
                    </td>
                    <td className={styles.secondaryCell}>
                      <span className={styles.dateStack}>
                        <span>
                          {user.lastLoginAt
                            ? `Connexion ${formatDate(user.lastLoginAt)}`
                            : "Jamais connecté"}
                        </span>
                        <small>Inscrit {formatDate(user.createdAt)}</small>
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {isSelf ? (
                          <span className={styles.selfLabel}>Votre compte</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`${styles.actionButton} ${user.disabledAt ? "" : styles.dangerAction}`}
                              onClick={() =>
                                onAction(
                                  user.disabledAt
                                    ? {
                                        kind: "user",
                                        id: user.id,
                                        action: "unban",
                                        title: `Réactiver ${user.username}`,
                                        description:
                                          "Le membre retrouvera l’accès au site et ses launchers pourront de nouveau être utilisés.",
                                        reasonRequired: false,
                                        danger: false,
                                        success: `${user.username} a été réactivé.`,
                                      }
                                    : {
                                        kind: "user",
                                        id: user.id,
                                        action: "ban",
                                        title: `Suspendre ${user.username}`,
                                        description:
                                          "Le compte sera suspendu et ses launchers seront fermés dans l’application.",
                                        reasonRequired: true,
                                        danger: true,
                                        success: `${user.username} a été suspendu.`,
                                      },
                                )
                              }
                            >
                              {user.disabledAt ? "Réactiver" : "Suspendre"}
                            </button>
                            {!isProtectedAdmin ? (
                              <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() =>
                                  onAction(
                                    isAdmin
                                      ? {
                                          kind: "user",
                                          id: user.id,
                                          action: "demote",
                                          title: `Retirer les droits de ${user.username}`,
                                          description:
                                            "Ce membre perdra son accès à la console d’administration.",
                                          reasonRequired: false,
                                          danger: true,
                                          success: `${user.username} est redevenu membre.`,
                                        }
                                      : {
                                          kind: "user",
                                          id: user.id,
                                          action: "promote",
                                          title: `Promouvoir ${user.username}`,
                                          description:
                                            "Ce membre obtiendra un contrôle global sur YourLauncher.",
                                          reasonRequired: false,
                                          danger: true,
                                          success: `${user.username} est maintenant administrateur.`,
                                        },
                                  )
                                }
                              >
                                {isAdmin ? "Rétrograder" : "Promouvoir"}
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LaunchersPanel({
  launchers,
  query,
  onAction,
}: {
  launchers: AdminLauncher[];
  query: string;
  onAction: (operation: PendingOperation) => void;
}) {
  return (
    <div
      id="admin-panel-launchers"
      role="tabpanel"
      aria-label="Launchers"
      className={styles.panel}
    >
      <PanelHeading
        eyebrow="Parc de launchers"
        title="Contrôle des projets"
        description="Une suspension désactive le manifeste distant et bloque les nouveaux lancements."
        count={launchers.length}
      />
      {launchers.length === 0 ? (
        <EmptyState query={query} label="launcher" />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Liste des launchers YourLauncher
            </caption>
            <thead>
              <tr>
                <th scope="col">Launcher</th>
                <th scope="col">Propriétaire</th>
                <th scope="col">Publication</th>
                <th scope="col">Contrôle</th>
                <th scope="col">Dernière mise à jour</th>
                <th scope="col" className={styles.actionsHeading}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {launchers.map((launcher) => (
                <tr key={launcher.id}>
                  <td>
                    <div className={styles.launcherName}>
                      <span className={styles.launcherGlyph}>
                        <UiIcon name="rocket" size={16} />
                      </span>
                      <span>
                        <strong>{launcher.title}</strong>
                        <small>/{launcher.slug}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.ownerCell}>
                      {launcher.owner.username}
                      {launcher.owner.disabledAt ? (
                        <small>Compte suspendu</small>
                      ) : null}
                    </span>
                  </td>
                  <td>
                    <span className={styles.badge}>
                      {statusLabel(launcher.status)}
                    </span>
                  </td>
                  <td>
                    {launcher.suspendedAt ? (
                      <span
                        className={`${styles.badge} ${styles.badgeDanger}`}
                        title={launcher.suspensionReason ?? undefined}
                      >
                        Suspendu
                      </span>
                    ) : (
                      <span
                        className={`${styles.badge} ${styles.badgeSuccess}`}
                      >
                        Autorisé
                      </span>
                    )}
                  </td>
                  <td className={styles.secondaryCell}>
                    {formatDate(launcher.updatedAt)}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${launcher.suspendedAt ? "" : styles.dangerAction}`}
                        onClick={() =>
                          onAction(
                            launcher.suspendedAt
                              ? {
                                  kind: "launcher",
                                  id: launcher.id,
                                  action: "restore",
                                  title: `Restaurer ${launcher.title}`,
                                  description:
                                    "Le manifeste redeviendra accessible et les joueurs pourront de nouveau lancer le jeu.",
                                  reasonRequired: false,
                                  danger: false,
                                  success: `${launcher.title} a été restauré.`,
                                }
                              : {
                                  kind: "launcher",
                                  id: launcher.id,
                                  action: "suspend",
                                  title: `Suspendre ${launcher.title}`,
                                  description:
                                    "Le manifeste sera fermé et le launcher client refusera les nouveaux lancements.",
                                  reasonRequired: true,
                                  danger: true,
                                  success: `${launcher.title} a été suspendu.`,
                                },
                          )
                        }
                      >
                        {launcher.suspendedAt ? "Restaurer" : "Suspendre"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BansPanel({
  bans,
  launchers,
  query,
  scope,
  subjectType,
  subjectValue,
  launcherId,
  reason,
  expiresAt,
  onScopeChange,
  onSubjectTypeChange,
  onSubjectValueChange,
  onLauncherIdChange,
  onReasonChange,
  onExpiresAtChange,
  onSubmit,
  onRevoke,
}: {
  bans: PlayerBan[];
  launchers: AdminLauncher[];
  query: string;
  scope: "global" | "launcher";
  subjectType: BanDraft["subjectType"];
  subjectValue: string;
  launcherId: string;
  reason: string;
  expiresAt: string;
  onScopeChange: (value: "global" | "launcher") => void;
  onSubjectTypeChange: (value: BanDraft["subjectType"]) => void;
  onSubjectValueChange: (value: string) => void;
  onLauncherIdChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onExpiresAtChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRevoke: (operation: PendingOperation) => void;
}) {
  return (
    <div
      id="admin-panel-playerBans"
      role="tabpanel"
      aria-label="Interdictions joueurs"
      className={styles.panel}
    >
      <PanelHeading
        eyebrow="Sécurité des joueurs"
        title="Interdictions Minecraft"
        description="Refusez les prochains lancements d’une identité déclarée par le client (UUID Microsoft ou pseudo hors-ligne), globalement ou sur un launcher. Pour une interdiction autoritative, appliquez-la aussi sur le serveur Minecraft ou le proxy."
        count={bans.length}
      />

      <form className={styles.banForm} onSubmit={onSubmit}>
        <div className={styles.formHeading}>
          <span className={styles.formIcon}>
            <UiIcon name="shield" size={18} />
          </span>
          <div>
            <strong>Créer une interdiction</strong>
            <small>
              La confirmation finale est demandée avant application.
            </small>
          </div>
        </div>
        <div className={styles.formGrid}>
          <label>
            Type d’identifiant
            <select
              value={subjectType}
              onChange={(event) =>
                onSubjectTypeChange(
                  event.target.value as BanDraft["subjectType"],
                )
              }
            >
              <option value="offline_username">Pseudo hors-ligne</option>
              <option value="microsoft_uuid">UUID Minecraft Microsoft</option>
            </select>
          </label>
          <label>
            {subjectType === "microsoft_uuid"
              ? "UUID Minecraft Microsoft"
              : "Pseudo joueur"}
            <input
              type="text"
              required
              value={subjectValue}
              placeholder={
                subjectType === "microsoft_uuid"
                  ? "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  : "Steve"
              }
              onChange={(event) => onSubjectValueChange(event.target.value)}
            />
          </label>
          <fieldset className={styles.scopeField}>
            <legend>Portée du blocage</legend>
            <div>
              <label>
                <input
                  type="radio"
                  name="ban-scope"
                  checked={scope === "global"}
                  onChange={() => onScopeChange("global")}
                />
                Tous les launchers
              </label>
              <label>
                <input
                  type="radio"
                  name="ban-scope"
                  checked={scope === "launcher"}
                  onChange={() => onScopeChange("launcher")}
                />
                Un launcher
              </label>
            </div>
          </fieldset>
          {scope === "launcher" ? (
            <label>
              Launcher concerné
              <input
                type="text"
                list="admin-launcher-options"
                required
                value={launcherId}
                placeholder="Sélectionnez ou collez un ID"
                onChange={(event) => onLauncherIdChange(event.target.value)}
              />
              <datalist id="admin-launcher-options">
                {launchers.map((launcher) => (
                  <option key={launcher.id} value={launcher.id}>
                    {launcher.title} (/{launcher.slug})
                  </option>
                ))}
              </datalist>
            </label>
          ) : null}
          <label className={styles.reasonField}>
            Motif de l’interdiction
            <textarea
              required
              minLength={ADMIN_REASON_MIN_LENGTH}
              maxLength={ADMIN_REASON_MAX_LENGTH}
              value={reason}
              placeholder="Décrivez précisément la règle enfreinte…"
              onChange={(event) => onReasonChange(event.target.value)}
            />
          </label>
          <label>
            Expiration optionnelle
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => onExpiresAtChange(event.target.value)}
            />
          </label>
        </div>
        <div className={styles.formFooter}>
          <span>
            <UiIcon name="activity" size={14} /> L’action sera inscrite dans le
            journal.
          </span>
          <button className="btn danger" type="submit">
            Créer l’interdiction
          </button>
        </div>
      </form>

      {bans.length === 0 ? (
        <EmptyState query={query} label="interdiction" />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Interdictions joueurs</caption>
            <thead>
              <tr>
                <th scope="col">Joueur</th>
                <th scope="col">Portée</th>
                <th scope="col">Motif</th>
                <th scope="col">État</th>
                <th scope="col">Création / expiration</th>
                <th scope="col" className={styles.actionsHeading}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {bans.map((ban) => {
                const active = isActiveBan(ban);
                return (
                  <tr key={ban.id}>
                    <td>
                      <span className={styles.subjectCell}>
                        <strong>{ban.subjectValue}</strong>
                        <small>
                          {ban.subjectType === "microsoft_uuid"
                            ? "UUID Minecraft Microsoft"
                            : "Pseudo hors-ligne"}
                        </small>
                      </span>
                    </td>
                    <td>
                      <span className={styles.scopeBadge}>
                        {ban.scope === "global"
                          ? "Tous les launchers"
                          : (ban.launcher?.title ?? "Launcher ciblé")}
                      </span>
                    </td>
                    <td className={styles.reasonCell}>{ban.reason}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${active ? styles.badgeDanger : ""}`}
                      >
                        {active
                          ? "Active"
                          : ban.revokedAt
                            ? "Révoquée"
                            : "Expirée"}
                      </span>
                    </td>
                    <td className={styles.secondaryCell}>
                      <span className={styles.dateStack}>
                        <span>{formatDate(ban.createdAt)}</span>
                        <small>
                          {ban.expiresAt
                            ? `Expire ${formatDate(ban.expiresAt)}`
                            : "Sans expiration"}
                        </small>
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {active ? (
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() =>
                              onRevoke({
                                kind: "revokeBan",
                                id: ban.id,
                                title: `Révoquer l’interdiction de ${ban.subjectValue}`,
                                description:
                                  "Le joueur pourra de nouveau utiliser les launchers concernés.",
                                reasonRequired: false,
                                danger: false,
                                success: `L’interdiction de ${ban.subjectValue} a été révoquée.`,
                              })
                            }
                          >
                            Révoquer
                          </button>
                        ) : (
                          <span className={styles.selfLabel}>Archivée</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditPanel({
  entries,
  query,
}: {
  entries: AuditEntry[];
  query: string;
}) {
  return (
    <div
      id="admin-panel-audit"
      role="tabpanel"
      aria-label="Journal d’audit"
      className={styles.panel}
    >
      <PanelHeading
        eyebrow="Traçabilité"
        title="Journal d’audit"
        description="Chaque action sensible conserve son auteur, sa cible et son contexte."
        count={entries.length}
      />
      {entries.length === 0 ? (
        <EmptyState query={query} label="événement" />
      ) : (
        <div className={styles.auditList}>
          {entries.map((entry) => (
            <article key={entry.id}>
              <span className={styles.auditIcon}>
                <UiIcon name="activity" size={16} />
              </span>
              <div className={styles.auditMain}>
                <div>
                  <strong>{entry.action.replaceAll("_", " ")}</strong>
                  <span>{formatDate(entry.createdAt)}</span>
                </div>
                <p>{formatMetadata(entry.metadata)}</p>
                <small>
                  {entry.targetType} · {entry.targetId}
                </small>
              </div>
              <span className={styles.auditActor}>
                <small>Effectué par</small>
                <strong>{entry.actor?.username ?? "Système"}</strong>
              </span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className={styles.panelHeading}>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <strong>{new Intl.NumberFormat("fr-FR").format(count)} affiché(s)</strong>
    </div>
  );
}

function EmptyState({ query, label }: { query: string; label: string }) {
  return (
    <div className={styles.emptyState}>
      <span>
        <UiIcon name="layers" size={22} />
      </span>
      <strong>Aucun {label}</strong>
      <p>
        {query
          ? `Aucun résultat ne correspond à « ${query} ».`
          : "Aucune donnée n’est disponible pour le moment."}
      </p>
    </div>
  );
}

function ConfirmationDialog({
  operation,
  reason,
  error,
  reasonRef,
  mutating,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  operation: PendingOperation;
  reason: string;
  error: string | null;
  reasonRef: React.RefObject<HTMLTextAreaElement | null>;
  mutating: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const normalizedReasonLength = reason.trim().length;
  const invalidRequiredReason =
    operation.reasonRequired &&
    (normalizedReasonLength < ADMIN_REASON_MIN_LENGTH ||
      normalizedReasonLength > ADMIN_REASON_MAX_LENGTH);

  useEffect(() => {
    if (!operation.reasonRequired) cancelRef.current?.focus();
  }, [operation]);

  return (
    <div className={styles.modalBackdrop}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
      >
        <div
          className={`${styles.modalIcon} ${operation.danger ? styles.modalDanger : ""}`}
        >
          <UiIcon name={operation.danger ? "shield" : "check"} size={22} />
        </div>
        <h2 id="admin-confirm-title">{operation.title}</h2>
        <p id="admin-confirm-description">{operation.description}</p>
        {operation.kind === "createBan" ? (
          <div className={styles.confirmationSummary}>
            <span>
              <strong>Identifiant</strong>
              {operation.draft.subjectValue}
            </span>
            <span>
              <strong>Motif</strong>
              {operation.draft.reason}
            </span>
          </div>
        ) : null}
        {operation.reasonRequired ? (
          <label className={styles.modalReason}>
            Motif obligatoire
            <textarea
              ref={reasonRef}
              required
              minLength={ADMIN_REASON_MIN_LENGTH}
              maxLength={ADMIN_REASON_MAX_LENGTH}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Expliquez la décision pour le journal d’audit…"
            />
          </label>
        ) : null}
        {error ? (
          <p className={styles.modalError} role="alert">
            <UiIcon name="shield" size={15} />
            <span>{error}</span>
          </p>
        ) : null}
        <div className={styles.modalActions}>
          <button
            ref={cancelRef}
            className="btn ghost"
            type="button"
            onClick={onCancel}
            disabled={mutating}
          >
            Annuler
          </button>
          <button
            className={operation.danger ? "btn danger" : "btn"}
            type="button"
            onClick={onConfirm}
            disabled={mutating || invalidRequiredReason}
          >
            {mutating ? "Application…" : "Confirmer"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AdminLoading() {
  return (
    <div className={styles.loadingState} aria-live="polite" aria-busy="true">
      <div className={styles.loadingHeading}>
        <span />
        <i />
      </div>
      <div className={styles.loadingMetrics}>
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className={styles.loadingTable}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className={styles.srOnly}>Chargement de la console d’administration</p>
    </div>
  );
}
