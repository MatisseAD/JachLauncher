import { useEffect, useRef, useState } from "react";
import type { LauncherManifest } from "@jach/shared";
import {
  LauncherSkin,
  manifestToSkinConfig,
  type PlayState,
  type RamMode,
  type SkinDiagnostic,
  type SkinNotification,
  type SkinProgress,
  type SkinState,
  type TabId,
} from "@jach/ui";
import "@jach/ui/skin.css";
import {
  DEFAULT_BASE_URL,
  DEFAULT_SETTINGS,
  type Account,
  type LaunchPhase,
  type LaunchProgress,
  type LauncherSettings,
  type SystemInfo,
  type SavedLauncher,
  type InstanceStatus,
  type LoadManifestResult,
} from "../../shared-types/ipc";

function toPlayState(
  phase: LaunchPhase,
  instanceStatus: InstanceStatus,
): PlayState {
  switch (phase) {
    case "manifest":
    case "java":
      return "verifying";
    case "downloading":
      return "downloading";
    case "extracting":
      return "extracting";
    case "launching":
      return "launching";
    case "running":
      return "running";
    case "error":
      return "error";
    case "idle":
    case "closed":
    default:
      return instanceStatus;
  }
}

// RAM (Mo) selon le mode choisi, à partir des infos système.
function ramForMode(
  mode: RamMode,
  info: SystemInfo | null,
  current: number,
): number {
  if (!info) return current;
  switch (mode) {
    case "low":
      return 2048;
    case "balanced":
    case "auto":
      return info.recommendedRamMb;
    case "performance":
      return Math.min(
        Math.round((info.recommendedRamMb * 1.5) / 1024) * 1024,
        Math.max(2048, info.totalRamMb - 2048),
      );
    default:
      return current;
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [slug, setSlug] = useState("");
  const [manifest, setManifest] = useState<LauncherManifest | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<LauncherSettings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<TabId>("home");
  const [progress, setProgress] = useState<LaunchProgress>({
    phase: "idle",
    label: "",
    percent: null,
  });
  const [server, setServer] = useState<SkinState["server"]>(undefined);
  const [notes, setNotes] = useState<SkinNotification[]>([]);
  const [connectError, setConnectError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<SkinDiagnostic | null>(null);
  const [firstRun, setFirstRun] = useState(false);
  const [launchers, setLaunchers] = useState<SavedLauncher[]>([]);
  const [instanceStatus, setInstanceStatus] =
    useState<InstanceStatus>("first-install");
  const [adding, setAdding] = useState(false);
  const [advancedSource, setAdvancedSource] = useState(false);
  const logsRef = useRef<string[]>([]);

  function notify(kind: SkinNotification["kind"], message: string) {
    const id = crypto.randomUUID();
    setNotes((n) => [...n, { id, kind, message }]);
    setTimeout(() => setNotes((n) => n.filter((x) => x.id !== id)), 4000);
  }

  // Bootstrap
  useEffect(() => {
    (async () => {
      const s = await window.jach.getState();
      setBaseUrl(s.baseUrl);
      setAccount(s.account);
      setSettings(s.settings ?? DEFAULT_SETTINGS);
      setFirstRun(!s.seenIntro);
      setLaunchers(s.launchers ?? []);
      window.jach
        .systemInfo()
        .then(setSysInfo)
        .catch(() => {});
      if (s.slug) {
        setSlug(s.slug);
        await loadAndActivate(s.slug, s.baseUrl);
      }
      setReady(true);
    })();

    const offP = window.jach.onProgress(setProgress);
    const offL = window.jach.onLog((line) => {
      logsRef.current = [...logsRef.current.slice(-400), line];
    });
    return () => {
      offP();
      offL();
    };
  }, []);

  useEffect(() => {
    if (!manifest?.server.address) return;
    const timer = window.setInterval(() => {
      void refreshServer(manifest);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [manifest]);

  async function refreshServer(m: LauncherManifest) {
    if (!m.server.address) {
      setServer(undefined);
      return;
    }
    setServer({ online: false, loading: true });
    const st = await window.jach.serverStatus(m.server.address, m.server.port);
    setServer({ ...st, loading: false });
  }

  async function refreshLaunchers() {
    const s = await window.jach.getState();
    setLaunchers(s.launchers ?? []);
  }

  // Charge un launcher (par code + adresse) et l'active.
  async function loadAndActivate(
    targetSlug: string,
    targetBase: string,
  ): Promise<LoadManifestResult> {
    let result = await window.jach.loadManifest(targetSlug, targetBase);
    if (
      result.ok &&
      result.manifest &&
      result.trusted === false &&
      result.fingerprint
    ) {
      const files = [
        ...result.manifest.mods,
        ...result.manifest.resourcepacks,
        ...result.manifest.shaderpacks,
      ];
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const accepted = window.confirm(
        [
          `Faire confiance au launcher « ${result.manifest.branding.title} » ?`,
          "",
          `Source : ${new URL(targetBase).origin}`,
          `Empreinte : ${result.fingerprint.slice(0, 16)}…`,
          result.signature?.valid
            ? `Signature Ed25519 valide : ${result.signature.signerId?.slice(0, 16)}…`
            : "Signature : absente (confiance limitée à cette empreinte)",
          `Fichiers gérés : ${files.length} (${(totalSize / 1_048_576).toFixed(1)} Mo)`,
          "",
          "Toute modification ultérieure demandera une nouvelle approbation.",
        ].join("\n"),
      );
      if (!accepted) {
        return { ok: false, error: "Manifeste non approuvé." };
      }
      result = await window.jach.trustManifest(result.fingerprint);
    }
    if (result.ok && result.manifest && result.trusted) {
      setManifest(result.manifest);
      setBaseUrl(targetBase);
      setTab("home");
      void refreshServer(result.manifest);
      setInstanceStatus(await window.jach.instanceStatus());
      await refreshLaunchers();
    }
    return result;
  }

  async function connect() {
    setConnectError("");
    setBusy(true);
    try {
      const result = await loadAndActivate(slug.trim(), baseUrl);
      if (!result.ok || !result.manifest) {
        setConnectError(result.error ?? "Launcher introuvable");
        return;
      }
      setAdding(false);
      setSlug("");
    } catch (error) {
      setConnectError(
        error instanceof Error ? error.message : "Adresse invalide.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Carte de connexion réutilisée : écran initial ET overlay "Ajouter".
  function renderConnectCard(cancelable: boolean) {
    return (
      <div style={connectCard}>
        <img
          src="/logo.png"
          alt="YourLauncher"
          width={96}
          height={96}
          style={{
            display: "block",
            margin: "0 auto 8px",
            filter: "drop-shadow(0 6px 22px rgba(139,92,246,0.5))",
          }}
        />
        <h2 style={{ margin: "0 0 4px", textAlign: "center" }}>
          {cancelable ? "Ajouter un launcher" : "YourLauncher"}
        </h2>
        <p
          style={{
            color: "#a99fc4",
            textAlign: "center",
            marginTop: 0,
            fontSize: 13,
          }}
        >
          Entre le code du launcher fourni par ton serveur.
        </p>
        <label style={lbl}>Code du launcher</label>
        <input
          style={inp}
          value={slug}
          placeholder="serveur-demo"
          onChange={(e) => setSlug(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
        />
        <button
          type="button"
          style={{
            display: "block",
            margin: "-2px 0 14px",
            padding: 0,
            border: 0,
            background: "transparent",
            color: "#8f84ad",
            fontSize: 11,
            cursor: "pointer",
          }}
          onClick={() => setAdvancedSource((visible) => !visible)}
        >
          {advancedSource
            ? "Masquer la source avancée"
            : "Utiliser une autre source"}
        </button>
        {advancedSource && (
          <>
            <label style={lbl}>Adresse de la plateforme</label>
            <input
              style={inp}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </>
        )}
        <button style={connectBtn} disabled={busy || !slug} onClick={connect}>
          {busy
            ? "Chargement…"
            : cancelable
              ? "Ajouter et basculer"
              : "Charger le launcher"}
        </button>
        {cancelable && (
          <button
            style={{
              ...connectBtn,
              background: "transparent",
              border: "1px solid rgba(168,130,255,0.3)",
              color: "#a99fc4",
              marginTop: 8,
            }}
            onClick={() => {
              setAdding(false);
              setConnectError("");
            }}
          >
            Annuler
          </button>
        )}
        {connectError && (
          <div style={{ color: "#ff6b6b", fontSize: 13, marginTop: 10 }}>
            {connectError}
          </div>
        )}
        {!ready && !cancelable && (
          <div style={{ color: "#6b6188", fontSize: 12, marginTop: 10 }}>
            Initialisation…
          </div>
        )}
      </div>
    );
  }

  // --- Écran de connexion (avant chargement d'un launcher) ---
  if (!manifest) {
    return (
      <div style={connectWrap}>
        <div style={connectDrag}>
          <button
            style={connectClose}
            onClick={() => window.jach.closeWindow()}
          >
            ✕
          </button>
        </div>
        {renderConnectCard(false)}
      </div>
    );
  }

  // --- Launcher (skin partagé avec le site) ---
  const config = manifestToSkinConfig(manifest);
  const playState: PlayState = toPlayState(progress.phase, instanceStatus);
  const skinProgress: SkinProgress | undefined =
    progress.phase === "idle"
      ? undefined
      : { percent: progress.percent, label: progress.label };

  const state: SkinState = {
    activeTab: tab,
    playState,
    progress: skinProgress,
    account: account
      ? {
          username: account.username,
          type: account.type,
          avatarUrl: account.avatarUrl,
        }
      : null,
    server,
    notifications: notes,
    selectedProfileId: "default",
    windowControls: true,
    repairing,
    diagnostic,
    firstRun,
    systemRamMb: sysInfo?.totalRamMb,
    recommendedRamMb: sysInfo?.recommendedRamMb,
    launchers: launchers.map((l) => ({
      id: l.id,
      title: l.title,
      logoUrl: l.logoUrl,
      subtitle: l.slug,
      active:
        l.slug === manifest.id &&
        l.baseUrl.replace(/\/+$/, "") === baseUrl.replace(/\/+$/, ""),
    })),
    settings: {
      ramMb: settings.ramMb,
      ramMode: settings.ramMode,
      fullscreen: settings.fullscreen,
      closeOnLaunch: settings.closeOnLaunch,
      minimizeOnLaunch: settings.minimizeOnLaunch,
      resolution: settings.resolution,
    },
  };

  const skin = (
    <LauncherSkin
      config={config}
      state={state}
      handlers={{
        onTab: setTab,
        onPlay: async () => {
          setBusy(true);
          setDiagnostic(null);
          const r = await window.jach.launch();
          setBusy(false);
          if (!r.ok) {
            setDiagnostic(
              r.diagnostic ?? {
                title: "Erreur",
                message: r.error ?? "Échec du lancement",
              },
            );
            notify(
              "error",
              r.diagnostic?.title ?? r.error ?? "Échec du lancement",
            );
          } else {
            setInstanceStatus(await window.jach.instanceStatus());
          }
        },
        onLoginMicrosoft: async () => {
          const r = await window.jach.loginMicrosoft();
          if (r.ok && r.account) {
            setAccount(r.account);
            notify("success", "Connexion réussie");
          } else {
            notify("error", r.error ?? "Échec de la connexion");
          }
        },
        onLoginOffline: async (name) => {
          const r = await window.jach.setOfflineAccount(name);
          if (r.ok && r.account) {
            setAccount(r.account);
            notify("success", `Bienvenue ${r.account.username}`);
          } else {
            notify("error", r.error ?? "Pseudo invalide");
          }
        },
        onLogout: async () => {
          await window.jach.logout();
          setAccount(null);
        },
        onOpenLink: (url) => window.open(url, "_blank", "noopener"),
        onMinimize: () => window.jach.minimize(),
        onClose: () => window.jach.closeWindow(),
        onToggleFullscreen: () => window.jach.toggleFullscreen(),
        onChangeSetting: async (key, value) => {
          setSettings((s) => ({ ...s, [key]: value }));
          await window.jach.setSetting(
            key as keyof LauncherSettings,
            value as never,
          );
        },
        onSelectRamMode: async (mode) => {
          const ram = ramForMode(mode, sysInfo, settings.ramMb);
          setSettings((s) => ({ ...s, ramMode: mode, ramMb: ram }));
          await window.jach.setSetting("ramMode", mode);
          if (mode !== "custom") await window.jach.setSetting("ramMb", ram);
        },
        onRepair: async () => {
          setRepairing(true);
          setDiagnostic(null);
          const r = await window.jach.repair();
          setRepairing(false);
          setInstanceStatus(await window.jach.instanceStatus());
          notify(
            r.ok ? "success" : "error",
            r.ok
              ? "Réparation terminée"
              : (r.error ?? "Échec de la réparation"),
          );
        },
        onCopyReport: async () => {
          const report = await window.jach.getReport();
          try {
            await navigator.clipboard.writeText(report);
            notify("success", "Rapport copié");
          } catch {
            notify("error", "Impossible de copier");
          }
        },
        onAddLauncher: () => {
          setSlug("");
          setConnectError("");
          setAdding(true);
        },
        onSelectLauncher: async (id) => {
          const selected = launchers.find((launcher) => launcher.id === id);
          if (!selected) return;
          if (
            selected.slug === manifest.id &&
            selected.baseUrl.replace(/\/+$/, "") === baseUrl.replace(/\/+$/, "")
          ) {
            return;
          }
          await loadAndActivate(selected.slug, selected.baseUrl);
        },
        onRemoveLauncher: async (id) => {
          const removed = launchers.find((launcher) => launcher.id === id);
          const list = await window.jach.removeLauncher(id);
          setLaunchers(list);
          if (
            removed?.slug === manifest.id &&
            removed.baseUrl.replace(/\/+$/, "") === baseUrl.replace(/\/+$/, "")
          ) {
            if (list.length > 0) {
              await loadAndActivate(list[0].slug, list[0].baseUrl);
            } else {
              setManifest(null);
            }
          }
        },
        onFinishIntro: async () => {
          setFirstRun(false);
          await window.jach.markIntroSeen();
        },
      }}
    />
  );

  return (
    <>
      {skin}
      {adding && (
        <div
          style={
            {
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(6,5,12,0.78)",
              backdropFilter: "blur(4px)",
              WebkitAppRegion: "no-drag",
            } as React.CSSProperties
          }
        >
          {renderConnectCard(true)}
        </div>
      )}
    </>
  );
}

/* styles inline de l'écran de connexion */
const connectWrap: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background:
    "radial-gradient(900px 500px at 80% -10%, rgba(139,92,246,0.12), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(167,139,250,0.1), transparent 60%), #0b0814",
};
const connectDrag: React.CSSProperties = {
  height: 40,
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  padding: "0 10px",
  WebkitAppRegion: "drag",
} as React.CSSProperties;
const connectClose: React.CSSProperties = {
  WebkitAppRegion: "no-drag",
  width: 30,
  height: 26,
  border: "none",
  borderRadius: 7,
  background: "rgba(255,255,255,0.06)",
  color: "#e9eef5",
  cursor: "pointer",
} as React.CSSProperties;
const connectCard: React.CSSProperties = {
  margin: "auto",
  width: 380,
  background: "rgba(24,17,40,0.85)",
  border: "1px solid rgba(168,130,255,0.18)",
  borderRadius: 16,
  padding: 28,
  backdropFilter: "blur(10px)",
};
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#a99fc4",
  margin: "12px 0 6px",
};
const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.3)",
  color: "#e9eef5",
  fontSize: 14,
};
const connectBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 18,
  padding: "12px",
  borderRadius: 9,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  color: "#ffffff",
  background: "linear-gradient(120deg,#7c3aed,#a78bfa)",
};
