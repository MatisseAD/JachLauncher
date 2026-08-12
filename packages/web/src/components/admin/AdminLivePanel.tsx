"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import UiIcon from "@/components/UiIcon";
import styles from "./AdminConsole.module.css";

type LiveSession = {
  id: string;
  subjectType: "microsoft_uuid" | "offline_username";
  subjectValue: string;
  username: string;
  clientVersion: string;
  state: "open" | "in_game";
  openedAt: string;
  lastHeartbeatAt: string;
  expiresAt: string;
  gameStartedAt: string | null;
  pendingCommandId: string | null;
  pendingCommand: "stop_game" | "close_client" | null;
  pendingCommandReason: string | null;
  pendingCommandAt: string | null;
  launcher: { id: string; slug: string; title: string };
};

type LiveResponse = {
  generatedAt: string;
  refreshAfterSeconds: number;
  metrics: { total: number; inGame: number; launcherOpen: number };
  truncated: boolean;
  sessions: LiveSession[];
};

type PendingCommand = {
  session: LiveSession;
  action: "stop_game" | "close_client";
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Indisponible";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

async function responseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof payload?.error === "string"
    ? payload.error
    : "La requête a échoué (" + response.status + ").";
}

export default function AdminLivePanel({ query }: { query: string }) {
  const [data, setData] = useState<LiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [pending, setPending] = useState<PendingCommand | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const generationRef = useRef(0);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({ limit: "100" });
      if (query) params.set("q", query);
      const response = await fetch("/api/admin/live-sessions?" + params, {
        cache: "no-store",
        credentials: "same-origin",
        signal,
      });
      if (!response.ok) throw new Error(await responseError(response));
      const next = (await response.json()) as LiveResponse;
      if (!Array.isArray(next.sessions)) {
        throw new Error("Réponse live invalide.");
      }
      setData(next);
      setError(null);
    },
    [query],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    let controller = new AbortController();
    let timer: number | undefined;
    const run = async () => {
      setRefreshing(true);
      try {
        await refresh(controller.signal);
      } catch (caught) {
        if (
          !controller.signal.aborted &&
          generation === generationRef.current
        ) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Impossible de charger les clients actifs.",
          );
        }
      } finally {
        if (generation === generationRef.current) setRefreshing(false);
      }
      if (generation === generationRef.current) {
        timer = window.setTimeout(() => {
          controller = new AbortController();
          void run();
        }, 10_000);
      }
    };
    void run();
    return () => {
      generationRef.current += 1;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [refresh]);

  async function sendCommand(event: FormEvent) {
    event.preventDefault();
    if (!pending || sending) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 3 || cleanReason.length > 500) {
      setError("Le motif doit contenir entre 3 et 500 caractères.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/admin/live-sessions/" + encodeURIComponent(pending.session.id),
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: pending.action,
            reason: cleanReason,
          }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      setFeedback(
        pending.action === "close_client"
          ? "Fermeture demandée à " + pending.session.username + "."
          : "Arrêt du jeu demandé à " + pending.session.username + ".",
      );
      setPending(null);
      setReason("");
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Commande impossible.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      id="admin-panel-live"
      className={styles.panel}
      role="tabpanel"
      aria-label="Clients en direct"
    >
      <div className={styles.panelHeading}>
        <div>
          <span>Présence déclarée</span>
          <h2>Clients et joueurs en direct</h2>
          <p>
            Dans le client officiel, une suspension ou interdiction arrête le
            jeu et ferme le client au prochain heartbeat reçu.
          </p>
        </div>
        <strong>{refreshing ? "Actualisation…" : "Direct"}</strong>
      </div>

      <div className={styles.liveSummary} aria-label="Résumé des présences">
        <span>
          <i className={styles.liveDot} /> {data?.metrics.total ?? 0} client(s)
        </span>
        <span>{data?.metrics.inGame ?? 0} en jeu</span>
        <span>{data?.metrics.launcherOpen ?? 0} dans le launcher</span>
        {data ? <small>Relevé {formatDate(data.generatedAt)}</small> : null}
      </div>
      <p className={styles.liveNotice}>
        Cette vue et ses commandes sont best-effort : présence, identité et
        exécution sont déclarées par le client officiel. Pour un contrôle
        autoritatif, appliquez aussi les règles sur le serveur ou proxy
        Minecraft.
      </p>

      {feedback ? (
        <div className={styles.liveFeedback} role="status">
          <UiIcon name="check" size={15} /> {feedback}
        </div>
      ) : null}
      {error ? (
        <div
          className={[styles.liveFeedback, styles.liveError].join(" ")}
          role="alert"
        >
          <UiIcon name="shield" size={15} /> {error}
        </div>
      ) : null}

      {pending ? (
        <form className={styles.liveCommandForm} onSubmit={sendCommand}>
          <div>
            <strong>
              {pending.action === "close_client"
                ? "Fermer le client"
                : "Arrêter Minecraft"}{" "}
              — {pending.session.username}
            </strong>
            <small>
              La commande sera exécutée au prochain heartbeat du client.
            </small>
          </div>
          <label>
            <span>Motif audité</span>
            <input
              autoFocus
              value={reason}
              minLength={3}
              maxLength={500}
              required
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motif de l'action administrative"
            />
          </label>
          <button
            className="btn secondary"
            type="button"
            disabled={sending}
            onClick={() => {
              setPending(null);
              setReason("");
            }}
          >
            Annuler
          </button>
          <button className="btn primary" type="submit" disabled={sending}>
            {sending ? "Envoi…" : "Confirmer"}
          </button>
        </form>
      ) : null}

      {data?.sessions.length ? (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Joueur déclaré</th>
                <th>Launcher</th>
                <th>État</th>
                <th>Version client</th>
                <th>Dernier heartbeat</th>
                <th>Commande</th>
                <th className={styles.actionsHeading}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <span className={styles.subjectCell}>
                      <strong>{session.username}</strong>
                      <small>
                        {session.subjectType === "microsoft_uuid"
                          ? "Microsoft"
                          : "Hors-ligne"}{" "}
                        · {session.subjectValue}
                      </small>
                    </span>
                  </td>
                  <td>
                    <span className={styles.launcherName}>
                      <span className={styles.launcherGlyph}>
                        {session.launcher.title.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>{session.launcher.title}</strong>
                        <small>{session.launcher.slug}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span
                      className={[
                        styles.badge,
                        session.state === "in_game" ? styles.badgeSuccess : "",
                      ].join(" ")}
                    >
                      {session.state === "in_game"
                        ? "En jeu"
                        : "Launcher ouvert"}
                    </span>
                  </td>
                  <td className={styles.secondaryCell}>
                    {session.clientVersion}
                  </td>
                  <td>
                    <span className={styles.dateStack}>
                      <strong>{formatDate(session.lastHeartbeatAt)}</strong>
                      <small>Ouvert {formatDate(session.openedAt)}</small>
                    </span>
                  </td>
                  <td>
                    {session.pendingCommand ? (
                      <span
                        className={[styles.badge, styles.badgeDanger].join(" ")}
                      >
                        {session.pendingCommand === "close_client"
                          ? "Fermeture en attente"
                          : "Arrêt en attente"}
                      </span>
                    ) : (
                      <span className={styles.selfLabel}>Aucune</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.actionButton}
                        type="button"
                        disabled={session.state !== "in_game"}
                        onClick={() => {
                          setPending({ session, action: "stop_game" });
                          setReason("");
                        }}
                      >
                        Arrêter le jeu
                      </button>
                      <button
                        className={[
                          styles.actionButton,
                          styles.dangerAction,
                        ].join(" ")}
                        type="button"
                        onClick={() => {
                          setPending({ session, action: "close_client" });
                          setReason("");
                        }}
                      >
                        Fermer le client
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span>
            <UiIcon name="activity" size={22} />
          </span>
          <strong>Aucun client actif</strong>
          <p>
            {query
              ? "Aucune présence ne correspond à cette recherche."
              : "Les launchers connectés apparaîtront ici automatiquement."}
          </p>
        </div>
      )}

      {data?.truncated ? (
        <p className={styles.liveTruncated}>
          Seuls les 100 heartbeats les plus récents sont affichés. Affinez la
          recherche pour retrouver un client précis.
        </p>
      ) : null}
    </section>
  );
}
