import { useEffect, useState, type CSSProperties } from "react";
import type {
  LauncherSkinProps,
  PlayState,
  RamMode,
  SkinProgress,
  SkinSettings,
  TabId,
} from "./types";

const LAUNCHER_TYPE: Record<string, string> = {
  vanilla: "Vanilla",
  modded: "Moddé",
  private: "Serveur privé",
  minigames: "Mini-jeux",
  survival: "Survie",
  rp: "Roleplay",
};

const NEWS_CAT: Record<string, { label: string; color: string }> = {
  update: { label: "Update", color: "#38bdf8" },
  event: { label: "Event", color: "#a78bfa" },
  patch: { label: "Patch", color: "#3ad07a" },
  shop: { label: "Boutique", color: "#ffc44d" },
  maintenance: { label: "Maintenance", color: "#ff8a3d" },
  community: { label: "Communauté", color: "#ff6bd6" },
};

const DEFAULT_SETTINGS: SkinSettings = {
  ramMb: 4096,
  ramMode: "balanced",
  fullscreen: false,
  closeOnLaunch: false,
  minimizeOnLaunch: true,
  resolution: "1280x720",
};

// Pseudo-aléatoire DÉTERMINISTE (hash uint32) : pas de décalage d'hydratation.
function rand(n: number) {
  let x = (n * 2654435761) >>> 0;
  x = ((x ^ (x >>> 15)) * 2246822519) >>> 0;
  x = ((x ^ (x >>> 13)) * 3266489917) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

function playInfo(state: PlayState, p?: SkinProgress) {
  switch (state) {
    case "first-install":
      return { label: "Installer et jouer", cls: "", disabled: false };
    case "update":
      return { label: "Mettre à jour", cls: "", disabled: false };
    case "verifying":
      return { label: "Vérification des fichiers…", cls: "busy", disabled: true };
    case "downloading":
      return {
        label: p?.percent != null ? `Téléchargement… ${p.percent}%` : "Téléchargement…",
        cls: "busy",
        disabled: true,
      };
    case "extracting":
      return { label: "Installation…", cls: "busy", disabled: true };
    case "launching":
      return { label: "Lancement…", cls: "busy", disabled: true };
    case "running":
      return { label: "En jeu ✓", cls: "busy", disabled: true };
    case "offline":
      return { label: "Serveur hors ligne", cls: "offline", disabled: true };
    case "error":
      return { label: "Réessayer", cls: "err", disabled: false };
    case "ready":
    default:
      return { label: "JOUER", cls: "", disabled: false };
  }
}

// Couleur d'une particule selon l'ambiance.
function ambColor(amb: string, i: number, config: any): string {
  switch (amb) {
    case "fire":
      return i % 2 ? "#ff8a3d" : "#ff5630";
    case "snow":
      return "#e6f3ff";
    case "stars":
      return i % 2 ? "#fff4c2" : "#cfe3ff";
    case "rain":
      return "#7fb4ff";
    case "glitch":
      return i % 2 ? config.secondaryColor : "#ff45d0";
    default:
      return i % 2 ? config.secondaryColor : config.primaryColor;
  }
}

export function LauncherSkin({ config, state, handlers, preview }: LauncherSkinProps) {
  const [offlineName, setOfflineName] = useState("");
  const h = handlers ?? {};
  const settings = state.settings ?? DEFAULT_SETTINGS;
  const radius = config.cardShape === "sharp" ? 3 : config.cardShape === "pill" ? 20 : 14;
  const amb = config.ambiance ?? "none";
  const fxClass = amb === "snow" || amb === "rain" ? "fall" : amb === "stars" || amb === "glitch" ? "twinkle" : "";
  const fast = amb === "snow" || amb === "rain" || amb === "glitch";

  const rootStyle: CSSProperties = {
    ["--jp" as string]: config.primaryColor,
    ["--js" as string]: config.secondaryColor,
    ["--jt" as string]: config.textColor,
    ["--jradius" as string]: `${radius}px`,
  };

  const bgStyle: CSSProperties = config.backgroundUrl
    ? { backgroundImage: `url(${config.backgroundUrl})` }
    : {
        background: `radial-gradient(700px 360px at 75% 0%, ${config.primaryColor}40, transparent 60%),
                     radial-gradient(520px 320px at 0% 100%, ${config.secondaryColor}30, transparent 60%),
                     #0a0e14`,
      };

  const go = (tab: TabId) => h.onTab?.(tab);

  // Onglets dynamiques (Événements / Notes seulement s'il y a du contenu).
  const nav: { id: TabId; ic: string; label: string }[] = [
    { id: "home", ic: "🏠", label: "Accueil" },
    ...(config.showNews ? [{ id: "news" as TabId, ic: "📰", label: "Actualités" }] : []),
    ...(config.events.length ? [{ id: "events" as TabId, ic: "📅", label: "Événements" }] : []),
    ...(config.patchNotes.length ? [{ id: "updates" as TabId, ic: "🆕", label: "Notes" }] : []),
    { id: "profiles", ic: "🎮", label: "Profils" },
    { id: "mods", ic: "🧩", label: "Mods" },
    { id: "settings", ic: "⚙️", label: "Paramètres" },
    { id: "help", ic: "❓", label: "Aide" },
  ];

  return (
    <div
      className={`jach-skin ${config.theme === "light" ? "is-light" : ""}`}
      data-style={config.visualStyle}
      data-btn={config.buttonStyle}
      data-menu={config.menuPlacement}
      style={rootStyle}
    >
      <div className="js-bg" style={bgStyle} />
      <div className="js-overlay" />
      <div className={`js-fx ${fxClass}`}>
        {Array.from({ length: 12 }).map((_, i) => {
          const c = ambColor(amb, i, config);
          const isLine = amb === "rain";
          return (
            <i
              key={i}
              style={{
                left: `${Math.round(rand(i + 1) * 100)}%`,
                width: isLine ? 2 : 4 + Math.round(rand(i + 2) * 8),
                height: isLine ? 14 : 4 + Math.round(rand(i + 2) * 8),
                background: c,
                boxShadow: `0 0 10px ${c}`,
                animationDuration: `${(fast ? 6 : 10) + Math.round(rand(i + 3) * 10)}s`,
                animationDelay: `${Math.round(rand(i + 4) * 10)}s`,
              }}
            />
          );
        })}
      </div>

      {/* Notifications */}
      {!!state.notifications?.length && (
        <div className="js-notes">
          {state.notifications.map((n) => (
            <div key={n.id} className={`js-note ${n.kind}`}>
              {n.message}
            </div>
          ))}
        </div>
      )}

      <div className="js-window">
        {/* Barre supérieure custom */}
        <div className="js-topbar">
          <span className="js-tt">{config.title}</span>
          {state.windowControls && (
            <div className="js-wbtns">
              <button className="js-wbtn" onClick={() => h.onMinimize?.()} title="Réduire">
                –
              </button>
              <button className="js-wbtn" onClick={() => h.onToggleFullscreen?.()} title="Plein écran">
                ▢
              </button>
              <button className="js-wbtn close" onClick={() => h.onClose?.()} title="Fermer">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Bannière d'alerte prioritaire */}
        {config.alert?.active && config.alert.message && (
          <div className={`js-alert ${config.alert.kind}`}>
            <span>{config.alert.kind === "warn" ? "⚠️" : config.alert.kind === "update" ? "⬆️" : "📣"}</span>
            {config.alert.message}
          </div>
        )}

        <div className="js-body">
          {/* Menu */}
          <nav className="js-sidebar">
            <div className="js-logo">
              {config.logoUrl ? <img src={config.logoUrl} alt="" /> : <div className="ph" />}
              <div className="nm">{config.title}</div>
            </div>
            {nav.map((n) => (
              <div
                key={n.id}
                className={`js-nav ${state.activeTab === n.id ? "active" : ""}`}
                onClick={() => go(n.id)}
              >
                <span className="ic">{n.ic}</span>
                {n.label}
              </div>
            ))}
            <div className="js-nav-spacer" />
            {config.links.length > 0 && (
              <div className="js-links-row">
                {config.links.map((l) => (
                  <div key={l.id} className="js-link" title={l.label} onClick={() => h.onOpenLink?.(l.url)}>
                    {l.icon}
                  </div>
                ))}
              </div>
            )}
          </nav>

          {/* Contenu + barre du bas */}
          <div className="js-mainwrap">
            <div className="js-content js-fade" key={state.activeTab}>
              {state.activeTab === "home" && (
                <Home config={config} state={state} h={h} offlineName={offlineName} setOfflineName={setOfflineName} />
              )}
              {state.activeTab === "news" && <NewsPage config={config} h={h} />}
              {state.activeTab === "events" && <EventsPage config={config} h={h} />}
              {state.activeTab === "updates" && <PatchNotesPage config={config} />}
              {state.activeTab === "profiles" && <ProfilesPage config={config} state={state} h={h} />}
              {state.activeTab === "mods" && <ModsPage config={config} />}
              {state.activeTab === "settings" && <SettingsPage settings={settings} state={state} h={h} preview={preview} />}
              {state.activeTab === "help" && <HelpPage config={config} h={h} />}
            </div>

            {/* Diagnostic d'erreur */}
            {state.playState === "error" && state.diagnostic && (
              <DiagnosticPanel diag={state.diagnostic} config={config} h={h} repairing={state.repairing} />
            )}

            <BottomBar config={config} state={state} h={h} />
          </div>
        </div>
      </div>

      {/* Parcours de première installation */}
      {state.firstRun && <FirstRunOverlay config={config} h={h} />}

      {/* Page de chargement */}
      {state.loading && (
        <div className="js-splash">
          <div className="lg" />
          <div className="nm">{config.title}</div>
          <div className="js-spinner" />
          <div style={{ color: "var(--jdim)", fontSize: 13 }}>Chargement du launcher…</div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Carte d'actu ----------------------------- */
function NewsCard({ n, h }: any) {
  const cat = n.category ? NEWS_CAT[n.category] : null;
  return (
    <div className="js-card hover js-news-card">
      <div className="img" style={n.imageUrl ? { backgroundImage: `url(${n.imageUrl})` } : undefined} />
      <div className="row" style={{ gap: 6, marginBottom: 4 }}>
        {cat && (
          <span
            className="js-tag"
            style={{ color: cat.color, background: `${cat.color}22` }}
          >
            {cat.label}
          </span>
        )}
        {n.isNew && <span className="js-tag ok">Nouveau</span>}
      </div>
      <div className="t">{n.title}</div>
      <div className="meta">
        {n.date}
        {n.readMinutes ? ` · ${n.readMinutes} min` : ""}
      </div>
      <div className="d">{n.description}</div>
      {n.buttonLabel && n.buttonUrl && (
        <span className="js-mini-btn" onClick={() => h.onOpenLink?.(n.buttonUrl)}>
          {n.buttonLabel}
        </span>
      )}
    </div>
  );
}

/* ----------------------------- Accueil ----------------------------- */
function Home({ config, state, h, offlineName, setOfflineName }: any) {
  const featured = config.news[0];
  const rest = config.news.slice(1, 5);
  const maint = config.maintenance?.active;
  const srv = state.server;

  return (
    <div className="js-home">
      <div className="col-main">
        <div className="js-head">
          <h1>{config.title}</h1>
        </div>

        {maint && (
          <div className="js-card" style={{ borderColor: "rgba(255,138,61,0.5)", background: "rgba(255,138,61,0.08)" }}>
            <div style={{ fontWeight: 800, color: "#ffb37a" }}>🛠️ Serveur en maintenance</div>
            <div style={{ color: "var(--jdim)", marginTop: 4 }}>
              {config.maintenance.reason || "Le serveur est temporairement indisponible."}
              {config.maintenance.until ? ` Retour prévu : ${config.maintenance.until}.` : ""}
            </div>
          </div>
        )}

        {config.showNews ? (
          <>
            {featured && (
              <div
                className="js-news-hero"
                style={featured.imageUrl ? { backgroundImage: `url(${featured.imageUrl})` } : undefined}
              >
                <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                  {featured.category && NEWS_CAT[featured.category] && (
                    <span className="js-tag" style={{ color: NEWS_CAT[featured.category].color, background: `${NEWS_CAT[featured.category].color}22` }}>
                      {NEWS_CAT[featured.category].label}
                    </span>
                  )}
                  {featured.isNew && <span className="js-tag ok">Nouveau</span>}
                </div>
                <div className="t">{featured.title}</div>
                <div className="d">{featured.description}</div>
                {featured.buttonLabel && featured.buttonUrl && (
                  <span className="js-mini-btn" onClick={() => h.onOpenLink?.(featured.buttonUrl)}>
                    {featured.buttonLabel}
                  </span>
                )}
              </div>
            )}
            {rest.length > 0 && (
              <div className="js-news-grid">
                {rest.map((n: any) => (
                  <NewsCard key={n.id} n={n} h={h} />
                ))}
              </div>
            )}
            {config.news.length === 0 && (
              <div className="js-card">
                <div className="js-section-title">Actualités</div>
                <div style={{ color: "var(--jdim)" }}>Aucune actualité pour le moment.</div>
              </div>
            )}
          </>
        ) : (
          <div className="js-card" style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⛏️</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Prêt à jouer ?</div>
              <div style={{ color: "var(--jdim)" }}>{config.preLaunchMessage || "Clique sur Jouer pour démarrer."}</div>
            </div>
          </div>
        )}
      </div>

      <div className="col-side">
        {/* Statut serveur enrichi */}
        <div className="js-card">
          <div className="js-section-title">Serveur</div>
          <div className="js-status">
            <span className={`js-dot ${srv?.online ? "on" : ""}`} />
            <span style={{ fontWeight: 700 }}>
              {maint ? "Maintenance" : srv?.loading ? "Vérification…" : srv?.online ? "En ligne" : "Hors ligne"}
            </span>
            {srv?.online && srv.pingMs != null && (
              <span style={{ marginLeft: "auto", color: "var(--jdim)", fontSize: 12 }}>{srv.pingMs} ms</span>
            )}
          </div>
          {srv?.online && srv.players != null && (
            <div style={{ marginTop: 8 }}>
              <span className="js-players">{srv.players}</span>
              <span style={{ color: "var(--jdim)" }}>
                {srv.maxPlayers ? ` / ${srv.maxPlayers}` : ""} joueurs
              </span>
            </div>
          )}
          {srv?.version && (
            <div style={{ marginTop: 6, color: "var(--jdim)", fontSize: 12 }}>{srv.version}</div>
          )}
          {srv?.motd && (
            <div style={{ marginTop: 6, fontSize: 12, fontStyle: "italic", opacity: 0.85 }}>{srv.motd}</div>
          )}
        </div>

        {/* Compte + skin joueur */}
        <div className="js-card">
          <div className="js-section-title">Compte</div>
          {state.account ? (
            <>
              <div className="js-account">
                {state.account.avatarUrl ? (
                  <img className="js-avatar" src={state.account.avatarUrl} alt="" style={{ imageRendering: "pixelated" }} />
                ) : (
                  <div className="js-avatar">{state.account.username.charAt(0).toUpperCase()}</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{state.account.username}</div>
                  <div style={{ color: "var(--jp)", fontSize: 12 }}>
                    ● {state.account.type === "microsoft" ? "Connecté (Microsoft)" : "Hors-ligne"}
                  </div>
                </div>
              </div>
              <button className="js-btn ghost block sm" style={{ marginTop: 10 }} onClick={() => h.onLogout?.()}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button className="js-btn block" onClick={() => h.onLoginMicrosoft?.()}>
                Se connecter avec Microsoft
              </button>
              <div style={{ textAlign: "center", color: "var(--jdim)", fontSize: 11, margin: "10px 0" }}>
                — ou hors-ligne —
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="js-input"
                  placeholder="Pseudo"
                  value={offlineName}
                  onChange={(e: any) => setOfflineName(e.target.value)}
                />
                <button className="js-btn ghost sm" disabled={!offlineName} onClick={() => h.onLoginOffline?.(offlineName)}>
                  OK
                </button>
              </div>
            </>
          )}
        </div>

        {/* Infos rapides */}
        <div className="js-card">
          <div className="js-section-title">Infos</div>
          <div className="js-set-row">
            <span className="lbl">Version</span>
            <span className="js-pill">{config.mcVersion}</span>
          </div>
          <div className="js-set-row">
            <span className="lbl">Loader</span>
            <span className="js-pill">{config.loader}</span>
          </div>
          <div className="js-set-row">
            <span className="lbl">Type</span>
            <span className="js-pill">{LAUNCHER_TYPE[config.launcherType] ?? config.launcherType}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Actualités ----------------------------- */
function NewsPage({ config, h }: any) {
  return (
    <>
      <div className="js-head">
        <h1>Actualités</h1>
      </div>
      {config.news.length === 0 ? (
        <div className="js-card" style={{ color: "var(--jdim)" }}>Aucune actualité.</div>
      ) : (
        <div className="js-news-grid">
          {config.news.map((n: any) => (
            <NewsCard key={n.id} n={n} h={h} />
          ))}
        </div>
      )}
    </>
  );
}

/* ----------------------------- Événements ----------------------------- */
function Countdown({ target }: { target: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  let diff = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(diff / 86400);
  diff -= d * 86400;
  const hh = Math.floor(diff / 3600);
  diff -= hh * 3600;
  const mm = Math.floor(diff / 60);
  const ss = diff - mm * 60;
  const cells = [
    { n: d, u: "j" },
    { n: hh, u: "h" },
    { n: mm, u: "min" },
    { n: ss, u: "s" },
  ];
  return (
    <div className="js-countdown">
      {cells.map((c, i) => (
        <div className="js-cd-cell" key={i}>
          <div className="n">{c.n}</div>
          <div className="u">{c.u}</div>
        </div>
      ))}
    </div>
  );
}

function EventsPage({ config, h }: any) {
  return (
    <>
      <div className="js-head">
        <h1>Événements</h1>
        <span className="sub">Ne rate aucun rendez-vous du serveur.</span>
      </div>
      {config.events.length === 0 ? (
        <div className="js-card" style={{ color: "var(--jdim)" }}>Aucun événement prévu.</div>
      ) : (
        config.events.map((e: any) => {
          const ts = e.startsAt ? Date.parse(e.startsAt) : NaN;
          return (
            <div key={e.id} className="js-card" style={{ display: "flex", gap: 14 }}>
              {e.imageUrl && (
                <div
                  style={{ width: 110, height: 90, borderRadius: 10, flex: "none", background: `url(${e.imageUrl}) center/cover` }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{e.title}</div>
                <div style={{ color: "var(--jdim)", fontSize: 13, marginTop: 2 }}>{e.description}</div>
                {e.rewards && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>🎁 {e.rewards}</div>
                )}
                {!Number.isNaN(ts) && ts > Date.now() && <Countdown target={ts} />}
                {e.buttonLabel && e.buttonUrl && (
                  <span className="js-mini-btn" onClick={() => h.onOpenLink?.(e.buttonUrl)}>
                    {e.buttonLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

/* ----------------------------- Patch notes ----------------------------- */
function PatchNotesPage({ config }: any) {
  return (
    <>
      <div className="js-head">
        <h1>Notes de mise à jour</h1>
      </div>
      {config.patchNotes.length === 0 ? (
        <div className="js-card" style={{ color: "var(--jdim)" }}>Aucune note pour le moment.</div>
      ) : (
        config.patchNotes.map((p: any) => (
          <div key={p.id} className="js-card">
            <div className="row spread">
              <div style={{ fontWeight: 800, fontSize: 15 }}>v{p.version}</div>
              <span className="js-pill">{p.date}</span>
            </div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--jdim)", fontSize: 13 }}>
              {p.lines.map((line: string, i: number) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );
}

/* ----------------------------- Profils / Launchers ----------------------------- */
function ProfilesPage({ config, state, h }: any) {
  const launchers = state.launchers as any[] | undefined;

  // Si des launchers enregistrés sont fournis : gestionnaire de launchers.
  if (launchers && launchers.length > 0) {
    return (
      <>
        <div className="js-head">
          <h1>Mes launchers</h1>
          <span className="sub">Change de serveur ou ajoutes-en un nouveau.</span>
          <div className="js-spacer" />
          <button className="js-btn sm" onClick={() => h.onAddLauncher?.()}>
            + Ajouter
          </button>
        </div>
        <div className="js-profiles">
          {launchers.map((l) => (
            <div key={l.id} className={`js-card hover js-profile ${l.active ? "sel" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {l.logoUrl ? (
                  <img src={l.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover", flex: "none" }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 9, flex: "none", background: "linear-gradient(135deg, var(--jp), var(--js))" }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => h.onSelectLauncher?.(l.id)}>
                  <div className="nm">{l.title}</div>
                  <div style={{ color: "var(--jdim)", fontSize: 12 }}>{l.subtitle ?? l.id}</div>
                </div>
                <button
                  className="js-link"
                  title="Retirer"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    h.onRemoveLauncher?.(l.id);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                {l.active ? (
                  <span className="js-tag ok">● Actif</span>
                ) : (
                  <button className="js-btn ghost sm" onClick={() => h.onSelectLauncher?.(l.id)}>
                    Sélectionner
                  </button>
                )}
              </div>
            </div>
          ))}
          {/* Carte "Ajouter" */}
          <div
            className="js-card hover"
            style={{ display: "grid", placeItems: "center", cursor: "pointer", minHeight: 110, border: "1px dashed var(--jborder-strong)" }}
            onClick={() => h.onAddLauncher?.()}
          >
            <div style={{ textAlign: "center", color: "var(--jdim)" }}>
              <div style={{ fontSize: 26 }}>＋</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Ajouter un launcher</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Sinon : profils de jeu (aperçu / config sans multi-launcher).
  const TAG: Record<string, { cls: string; label: string }> = {
    ready: { cls: "ok", label: "Prêt" },
    update: { cls: "warn", label: "Mise à jour requise" },
    unavailable: { cls: "err", label: "Indisponible" },
  };
  return (
    <>
      <div className="js-head">
        <h1>Profils de jeu</h1>
        <span className="sub">Sélectionne un profil avant de jouer.</span>
      </div>
      <div className="js-profiles">
        {config.profiles.map((p: any) => {
          const sel = state.selectedProfileId === p.id;
          const t = TAG[p.status] ?? TAG.ready;
          return (
            <div
              key={p.id}
              className={`js-card hover js-profile ${sel ? "sel" : ""}`}
              onClick={() => h.onSelectProfile?.(p.id)}
            >
              <div className="nm">{p.name}</div>
              {p.description && <div style={{ color: "var(--jdim)", fontSize: 12, marginTop: 4 }}>{p.description}</div>}
              <div className="row">
                <span className="js-pill">{p.mcVersion}</span>
                <span className="js-pill">{p.loader}</span>
                <span className="js-pill">{p.modCount} mods</span>
                <span className="js-pill">{p.ramMb} Mo</span>
              </div>
              <div className="row">
                <span className={`js-tag ${t.cls}`}>● {t.label}</span>
                {sel && <span className="js-tag ok">Sélectionné</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ----------------------------- Mods ----------------------------- */
function ModsPage({ config }: any) {
  const TAG: Record<string, { cls: string; label: string }> = {
    installed: { cls: "ok", label: "Installé" },
    download: { cls: "dim", label: "À télécharger" },
    update: { cls: "warn", label: "Mise à jour" },
    disabled: { cls: "dim", label: "Désactivé" },
    error: { cls: "err", label: "Erreur" },
  };
  return (
    <>
      <div className="js-head">
        <h1>Mods</h1>
        <span className="sub">{config.mods.length} mod(s) — installés automatiquement</span>
      </div>
      {config.mods.length === 0 ? (
        <div className="js-card" style={{ color: "var(--jdim)" }}>Aucun mod pour ce profil.</div>
      ) : (
        config.mods.map((m: any) => {
          const t = TAG[m.status] ?? TAG.installed;
          return (
            <div key={m.id} className="js-card js-mod">
              <div className="ic">
                {m.iconUrl ? <img src={m.iconUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: 9 }} /> : "🧩"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nm">
                  {m.name} {m.version && <span style={{ color: "var(--jdim)", fontWeight: 400 }}>v{m.version}</span>}
                </div>
                {m.description && <div className="d">{m.description}</div>}
              </div>
              {m.size && <span className="js-pill">{m.size}</span>}
              <span className={`js-tag ${t.cls}`}>● {t.label}</span>
            </div>
          );
        })
      )}
    </>
  );
}

/* ----------------------------- Paramètres ----------------------------- */
const RAM_MODES: { id: RamMode; label: string }[] = [
  { id: "auto", label: "Automatique" },
  { id: "low", label: "Faible" },
  { id: "balanced", label: "Équilibré" },
  { id: "performance", label: "Performance" },
  { id: "custom", label: "Personnalisé" },
];

function SettingsPage({ settings, state, h, preview }: any) {
  const change = (k: keyof SkinSettings, v: any) => {
    if (!preview) h.onChangeSetting?.(k, v);
  };
  const setMode = (m: RamMode) => {
    if (!preview) h.onSelectRamMode?.(m);
  };
  return (
    <>
      <div className="js-head">
        <h1>Paramètres</h1>
      </div>

      <div className="js-card">
        <div className="js-section-title">Performances — RAM</div>
        {state.recommendedRamMb && (
          <div className="hint" style={{ marginBottom: 10 }}>
            RAM recommandée : <b style={{ color: "var(--jp)" }}>{(state.recommendedRamMb / 1024).toFixed(0)} Go</b>
            {state.systemRamMb ? ` — ton PC dispose de ${(state.systemRamMb / 1024).toFixed(0)} Go.` : "."}
          </div>
        )}
        <div className="js-ram-modes">
          {RAM_MODES.map((m) => (
            <button key={m.id} className={`js-ram-chip ${settings.ramMode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="js-set-row" style={{ marginTop: 12 }}>
          <div>
            <div className="lbl">RAM allouée — {(settings.ramMb / 1024).toFixed(1)} Go</div>
            <div className="hint">{settings.ramMode === "custom" ? "Règle librement." : "Géré par le mode choisi."}</div>
          </div>
          <input
            type="range"
            min={1024}
            max={16384}
            step={512}
            value={settings.ramMb}
            disabled={settings.ramMode !== "custom"}
            style={{ width: 160, opacity: settings.ramMode === "custom" ? 1 : 0.5 }}
            onChange={(e: any) => change("ramMb", parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="js-card">
        <div className="js-section-title">Jeu</div>
        <div className="js-set-row">
          <div>
            <div className="lbl">Résolution de la fenêtre</div>
            <div className="hint">Taille de Minecraft au lancement.</div>
          </div>
          <select className="js-input" style={{ width: 140 }} value={settings.resolution} onChange={(e: any) => change("resolution", e.target.value)}>
            <option>854x480</option>
            <option>1280x720</option>
            <option>1600x900</option>
            <option>1920x1080</option>
          </select>
        </div>
        <div className="js-set-row">
          <div>
            <div className="lbl">Plein écran</div>
          </div>
          <Toggle checked={settings.fullscreen} onChange={(v) => change("fullscreen", v)} />
        </div>
      </div>

      <div className="js-card">
        <div className="js-section-title">Launcher</div>
        <div className="js-set-row">
          <div className="lbl">Minimiser après lancement</div>
          <Toggle checked={settings.minimizeOnLaunch} onChange={(v) => change("minimizeOnLaunch", v)} />
        </div>
        <div className="js-set-row">
          <div className="lbl">Fermer après lancement</div>
          <Toggle checked={settings.closeOnLaunch} onChange={(v) => change("closeOnLaunch", v)} />
        </div>
      </div>

      {/* Réparation */}
      <div className="js-card">
        <div className="js-section-title">Dépannage</div>
        <div className="js-set-row">
          <div>
            <div className="lbl">Réparer mon launcher</div>
            <div className="hint">Revérifie et retélécharge les fichiers manquants ou corrompus.</div>
          </div>
          <button className="js-btn ghost sm" disabled={preview || state.repairing} onClick={() => h.onRepair?.()}>
            {state.repairing ? "Réparation…" : "Réparer"}
          </button>
        </div>
      </div>
    </>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="js-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tr" />
    </label>
  );
}

/* ----------------------------- Aide / Support ----------------------------- */
const PROBLEMS = [
  "Le jeu ne se lance pas",
  "Téléchargement bloqué",
  "Crash au démarrage",
  "Mauvais compte",
  "Manque de RAM",
];

function HelpPage({ config, h }: any) {
  return (
    <>
      <div className="js-head">
        <h1>Aide</h1>
      </div>
      <div className="js-card">
        <div className="js-section-title">Bien démarrer</div>
        <p style={{ color: "var(--jdim)" }}>
          Connecte-toi, sélectionne ton profil puis clique sur <b>Jouer</b>. Le launcher télécharge
          automatiquement les fichiers et le bon Java.
        </p>
      </div>

      <div className="js-card">
        <div className="js-section-title">J&apos;ai un problème</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {PROBLEMS.map((p) => (
            <span key={p} className="js-pill">
              {p}
            </span>
          ))}
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="js-btn sm" onClick={() => h.onCopyReport?.()}>
            📋 Copier le rapport
          </button>
          {config.supportUrl && (
            <button className="js-btn ghost sm" onClick={() => h.onOpenLink?.(config.supportUrl)}>
              🆘 Contacter le support
            </button>
          )}
          {config.links.find((l: any) => l.id === "discord") && (
            <button className="js-btn ghost sm" onClick={() => h.onOpenLink?.(config.links.find((l: any) => l.id === "discord").url)}>
              💬 Discord
            </button>
          )}
        </div>
      </div>

      {config.links.length > 0 && (
        <div className="js-card">
          <div className="js-section-title">Communauté</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {config.links.map((l: any) => (
              <button key={l.id} className="js-btn ghost sm" onClick={() => h.onOpenLink?.(l.url)}>
                {l.icon} {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------------------- Diagnostic ----------------------------- */
function DiagnosticPanel({ diag, config, h, repairing }: any) {
  return (
    <div className="js-diag">
      <div className="t">⚠️ {diag.title}</div>
      <div style={{ color: "var(--jdim)", fontSize: 13 }}>{diag.message}</div>
      <div className="row">
        <button className="js-btn sm" disabled={repairing} onClick={() => h.onRepair?.()}>
          {repairing ? "Réparation…" : "🔧 Réparer"}
        </button>
        <button className="js-btn ghost sm" onClick={() => h.onCopyReport?.()}>
          📋 Copier le rapport
        </button>
        {config.supportUrl && (
          <button className="js-btn ghost sm" onClick={() => h.onOpenLink?.(config.supportUrl)}>
            🆘 Support
          </button>
        )}
        {config.links.find((l: any) => l.id === "discord") && (
          <button className="js-btn ghost sm" onClick={() => h.onOpenLink?.(config.links.find((l: any) => l.id === "discord").url)}>
            💬 Discord
          </button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Première installation ----------------------------- */
function FirstRunOverlay({ config, h }: any) {
  const steps = ["Bienvenue", "Connexion", "Vérification", "Téléchargement", "Configuration", "Prêt à jouer"];
  return (
    <div className="js-intro">
      <div className="lg" style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(120deg, var(--jp), var(--js))" }} />
      <div style={{ fontSize: 22, fontWeight: 800 }}>Bienvenue sur {config.title}</div>
      <div style={{ color: "var(--jdim)", maxWidth: 460 }}>
        Le launcher va préparer tout ce qu&apos;il faut pour rejoindre le serveur : fichiers, mods et Java.
        Connecte-toi puis clique sur Jouer — on s&apos;occupe du reste.
      </div>
      <div className="steps">
        {steps.map((s, i) => (
          <div className="istep" key={i}>
            <span className="n">{i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <button className="js-btn" onClick={() => h.onFinishIntro?.()}>
        Commencer
      </button>
    </div>
  );
}

/* ----------------------------- Barre du bas ----------------------------- */
function BottomBar({ config, state, h }: any) {
  const maint = config.maintenance?.active;
  const info = playInfo(state.playState, state.progress);
  const busy = ["verifying", "downloading", "extracting", "launching", "running"].includes(state.playState);
  const profile = config.profiles.find((p: any) => p.id === state.selectedProfileId) ?? config.profiles[0];
  const noAccount = !state.account;

  // Le bouton devient intelligent : maintenance > connexion requise > état normal.
  let label = info.label;
  let cls = info.cls;
  let disabled = info.disabled;
  if (maint) {
    label = "Serveur en maintenance";
    cls = "offline";
    disabled = true;
  } else if (noAccount && state.playState === "ready") {
    label = "Connexion requise";
    cls = "offline";
    disabled = true;
  }

  return (
    <div className="js-bottombar">
      {profile && (
        <div className="prof">
          <span className="nm">{profile.name}</span>
          <span className="mt">
            {profile.mcVersion} · {profile.loader}
          </span>
        </div>
      )}

      {busy && state.progress ? (
        <div className="js-progress-wrap">
          <div className="js-progress-top">
            <span>{state.progress.label}</span>
            <span>
              {state.progress.speed ? `${state.progress.speed} · ` : ""}
              {state.progress.eta ? `${state.progress.eta} restant` : ""}
            </span>
          </div>
          <div className="js-track">
            <div
              className={`js-fill ${state.progress.percent == null ? "indet" : ""}`}
              style={{ width: `${state.progress.percent ?? 0}%` }}
            />
          </div>
          {state.progress.file && (
            <div className="js-progress-top" style={{ marginTop: 4, marginBottom: 0 }}>
              <span className="file">{state.progress.file}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="js-progress-wrap" style={{ color: "var(--jdim)", fontSize: 13 }}>
          {maint
            ? config.maintenance.until
              ? `Maintenance — retour prévu : ${config.maintenance.until}.`
              : "Serveur en maintenance."
            : state.playState === "error"
              ? "Une erreur est survenue."
              : state.playState === "offline"
                ? "Connexion impossible. Vérifie ta connexion."
                : noAccount
                  ? "Connecte-toi pour jouer."
                  : state.playState === "first-install"
                    ? "Première installation requise pour rejoindre le serveur."
                    : state.playState === "update"
                      ? "Une mise à jour est disponible."
                      : config.preLaunchMessage || "Prêt à jouer."}
        </div>
      )}

      <button
        className={`js-play ${cls}`}
        disabled={disabled}
        onClick={() => h.onPlay?.()}
        title={noAccount ? "Connecte-toi d'abord" : undefined}
      >
        {label}
      </button>
    </div>
  );
}

export default LauncherSkin;
