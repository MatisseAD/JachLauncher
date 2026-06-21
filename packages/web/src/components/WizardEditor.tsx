"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DownloadableFile, NewsEntry, EventEntry, PatchNote } from "@jach/shared";
import {
  DEFAULT_FORM,
  emptyEvent,
  emptyPatchNote,
  type LauncherFormData,
} from "@/lib/launcher-types";
import { PRESETS } from "@/lib/presets";
import LauncherPreview from "./LauncherPreview";
import AssetUpload from "./editor/AssetUpload";
import FileListEditor from "./editor/FileListEditor";
import NewsEditor from "./editor/NewsEditor";
import { fetchReleaseVersions, FALLBACK_VERSIONS } from "@/lib/mc-versions";

const STEPS = [
  "Infos générales",
  "Apparence",
  "Minecraft",
  "Mods & ressources",
  "Actualités",
  "Communauté",
  "Aperçu final",
];

function slugify(s: string): string {
  const stripped = s
    .normalize("NFD")
    .split("")
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return stripped.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

/** Nettoie l'état avant envoi (filtre les entrées incomplètes, vide -> null). */
function sanitize(d: LauncherFormData) {
  const cleanFiles = (arr: DownloadableFile[]) =>
    arr.filter((f) => f.url && /^https?:\/\//i.test(f.url) && f.fileName);
  const cleanNews = (arr: NewsEntry[]) => arr.filter((n) => n.title.trim());
  const cleanEvents = (arr: EventEntry[]) => arr.filter((e) => e.title.trim());
  const cleanPatch = (arr: PatchNote[]) => arr.filter((p) => p.version.trim());
  const orNull = (v?: string | null) => (v && v.trim() ? v : null);
  return {
    ...d,
    discordUrl: orNull(d.discordUrl),
    websiteUrl: orNull(d.websiteUrl),
    supportUrl: orNull(d.supportUrl),
    serverAddress: orNull(d.serverAddress),
    loaderVersion: orNull(d.loaderVersion),
    mods: cleanFiles(d.mods),
    resourcepacks: cleanFiles(d.resourcepacks),
    shaderpacks: cleanFiles(d.shaderpacks),
    news: cleanNews(d.news),
    events: cleanEvents(d.events),
    patchNotes: cleanPatch(d.patchNotes),
  };
}

export default function WizardEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: LauncherFormData;
}) {
  const router = useRouter();
  const [data, setData] = useState<LauncherFormData>(initial ?? DEFAULT_FORM);
  const [step, setStep] = useState(0);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const mounted = useRef(false);
  const inFlight = useRef(false);
  const blockedSlug = useRef<string | null>(null);

  function set<K extends keyof LauncherFormData>(key: K, value: LauncherFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }
  function patch(p: Partial<LauncherFormData>) {
    setData((d) => ({ ...d, ...p }));
  }

  // --- Sauvegarde automatique (debounce) ---
  async function persist() {
    const payload = sanitize(data);
    if (!data.id) {
      // Création : nécessite un nom + un slug valide.
      if (!payload.title.trim() || !/^[a-z0-9-]{3,40}$/.test(payload.slug)) return;
      if (blockedSlug.current === payload.slug) return;
      if (inFlight.current) return;
      inFlight.current = true;
      setSave("saving");
      const res = await fetch("/api/launchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      inFlight.current = false;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSave("error");
        setSaveError(json.error ?? "Erreur");
        if (res.status === 409) blockedSlug.current = payload.slug;
        return;
      }
      setData((d) => ({ ...d, id: json.id }));
      window.history.replaceState(null, "", `/dashboard/${json.id}`);
      setSave("saved");
    } else {
      setSave("saving");
      const res = await fetch(`/api/launchers/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSave("error");
        setSaveError(json.error ?? "Erreur");
        if (res.status === 409) blockedSlug.current = payload.slug;
        return;
      }
      blockedSlug.current = null;
      setSave("saved");
    }
  }

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const t = setTimeout(persist, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) patch(preset.apply);
  }

  async function generate() {
    if (!data.id) {
      await persist();
    }
    setGenerating(true);
    // Publie le launcher
    await fetch(`/api/launchers/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    set("status", "published");
    setGenerating(false);
    setGenerated(true);
  }

  const manifestUrl =
    typeof window !== "undefined" && data.slug
      ? `${window.location.origin}/api/manifest/${data.slug}`
      : "";

  return (
    <div className="editor-layout">
      {/* ---------- Colonne contrôles ---------- */}
      <div>
        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              onClick={() => setStep(i)}
            >
              <span className="num">{i < step ? "✓" : i + 1}</span>
              {label}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 0 && <StepInfos data={data} set={set} patch={patch} applyPreset={applyPreset} />}
          {step === 1 && <StepAppearance data={data} set={set} />}
          {step === 2 && <StepMinecraft data={data} set={set} />}
          {step === 3 && <StepContent data={data} set={set} />}
          {step === 4 && <StepNews data={data} set={set} />}
          {step === 5 && <StepCommunity data={data} set={set} />}
          {step === 6 && (
            <StepFinal
              data={data}
              generating={generating}
              generated={generated}
              manifestUrl={manifestUrl}
              onGenerate={generate}
              onEdit={() => setStep(0)}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="row spread" style={{ marginTop: 18 }}>
          <button
            className="btn ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            ← Précédent
          </button>

          <div className="row" style={{ gap: 14 }}>
            <AutosaveIndicator save={save} error={saveError} />
            {step < STEPS.length - 1 ? (
              <button className="btn" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                Suivant →
              </button>
            ) : (
              <Link className="btn ghost" href="/dashboard">
                Terminer
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Colonne aperçu ---------- */}
      <div className="preview-sticky">
        <div className="row spread" style={{ marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            Aperçu en direct
          </span>
          {data.id && (
            <Link className="btn ghost sm" href={`/preview/${data.slug}`} target="_blank">
              Plein écran ↗
            </Link>
          )}
        </div>
        <LauncherPreview data={data} />
        <p className="hint" style={{ marginTop: 10 }}>
          Le rendu se met à jour à chaque modification. C&apos;est exactement ce que verront tes joueurs.
        </p>
      </div>
    </div>
  );
}

/* =========================== Indicateur autosave =========================== */
function AutosaveIndicator({ save, error }: { save: string; error: string }) {
  if (save === "error") return <span className="error">⚠ {error || "Erreur de sauvegarde"}</span>;
  if (save === "saving")
    return (
      <span className="autosave saving">
        <span className="dot" /> Sauvegarde…
      </span>
    );
  if (save === "saved")
    return (
      <span className="autosave">
        <span className="dot" /> Enregistré
      </span>
    );
  return <span className="autosave faint">Modifications auto-sauvegardées</span>;
}

/* =============================== Étape 1 =============================== */
type StepProps = {
  data: LauncherFormData;
  set: <K extends keyof LauncherFormData>(k: K, v: LauncherFormData[K]) => void;
};

function StepInfos({
  data,
  set,
  patch,
  applyPreset,
}: StepProps & {
  patch: (p: Partial<LauncherFormData>) => void;
  applyPreset: (id: string) => void;
}) {
  return (
    <>
      <h3 style={{ marginTop: 0 }}>1 · Informations générales</h3>
      <p className="muted" style={{ marginTop: -6 }}>
        Donne une identité à ton launcher. Choisis un modèle pour partir vite.
      </p>

      <label>Modèle de départ</label>
      <div className="choice-grid" style={{ marginBottom: 18 }}>
        {PRESETS.map((p) => (
          <div key={p.id} className="choice" onClick={() => applyPreset(p.id)}>
            <div
              className="swatch"
              style={{ background: `linear-gradient(120deg, ${p.apply.primaryColor}, ${p.apply.secondaryColor})` }}
            />
            <div className="name">
              {p.emoji} {p.name}
            </div>
          </div>
        ))}
      </div>

      <div className="grid cols-2">
        <div className="field">
          <label>Nom du launcher</label>
          <input
            value={data.title}
            placeholder="Ex : Skyblock Légendaire"
            onChange={(e) => {
              const title = e.target.value;
              patch({
                title,
                slug: !data.id && (!data.slug || data.slug === slugify(data.title)) ? slugify(title) : data.slug,
              });
            }}
          />
          <div className="hint">Le nom affiché en haut du launcher.</div>
        </div>
        <div className="field">
          <label>Code (slug)</label>
          <input
            value={data.slug}
            placeholder="skyblock-legendaire"
            onChange={(e) => set("slug", slugify(e.target.value))}
          />
          <div className="hint">Le code que tes joueurs entrent dans le launcher.</div>
        </div>
      </div>

      <div className="field">
        <label>Description courte</label>
        <textarea
          value={data.description}
          placeholder="Ex : Le meilleur serveur Skyblock francophone, mis à jour chaque semaine."
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <AssetUpload
        label="Logo"
        kind="logo"
        value={data.logoUrl}
        launcherId={data.id}
        onChange={(v) => set("logoUrl", v)}
      />
      <AssetUpload
        label="Image de fond"
        kind="background"
        value={data.backgroundUrl}
        launcherId={data.id}
        onChange={(v) => set("backgroundUrl", v)}
        hint="Format paysage recommandé (1920×1080)."
      />

      <div className="grid cols-2">
        <div className="field">
          <label>Couleur principale</label>
          <input type="color" value={data.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
        </div>
        <div className="field">
          <label>Couleur secondaire</label>
          <input type="color" value={data.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Style visuel</label>
        <div className="choice-grid">
          {(["premium", "dark", "light", "pixel", "medieval", "futuristic"] as const).map((s) => (
            <div
              key={s}
              className={`choice ${data.visualStyle === s ? "active" : ""}`}
              onClick={() => set("visualStyle", s)}
            >
              <div className="name" style={{ textTransform: "capitalize" }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* =============================== Étape 2 =============================== */
function StepAppearance({ data, set }: StepProps) {
  return (
    <>
      <h3 style={{ marginTop: 0 }}>2 · Apparence du launcher</h3>
      <p className="muted" style={{ marginTop: -6 }}>
        Designe ton launcher sans coder. Regarde l&apos;aperçu changer en direct.
      </p>

      <div className="field">
        <label>Couleur du texte</label>
        <input type="color" value={data.textColor} onChange={(e) => set("textColor", e.target.value)} />
      </div>

      <div className="field">
        <label>Style du bouton « Jouer »</label>
        <div className="choice-grid">
          {(["glow", "flat", "pixel", "outline"] as const).map((s) => (
            <div key={s} className={`choice ${data.buttonStyle === s ? "active" : ""}`} onClick={() => set("buttonStyle", s)}>
              <div className="name" style={{ textTransform: "capitalize" }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="field">
          <label>Forme des cartes</label>
          <select value={data.cardShape} onChange={(e) => set("cardShape", e.target.value as LauncherFormData["cardShape"])}>
            <option value="rounded">Arrondies</option>
            <option value="sharp">Carrées (pixel)</option>
            <option value="pill">Très arrondies</option>
          </select>
        </div>
        <div className="field">
          <label>Placement du menu</label>
          <select value={data.menuPlacement} onChange={(e) => set("menuPlacement", e.target.value as LauncherFormData["menuPlacement"])}>
            <option value="left">À gauche</option>
            <option value="top">En haut</option>
          </select>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="field">
          <label>Thème</label>
          <select value={data.theme} onChange={(e) => set("theme", e.target.value as LauncherFormData["theme"])}>
            <option value="dark">Sombre</option>
            <option value="light">Clair</option>
          </select>
        </div>
      </div>

      <hr className="hr" />

      <label className="switch" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={data.showNews} onChange={(e) => set("showNews", e.target.checked)} />
        <span className="track" />
        Afficher les actualités
      </label>

      <div className="field">
        <label className="switch">
          <input type="checkbox" checked={data.showDiscord} onChange={(e) => set("showDiscord", e.target.checked)} />
          <span className="track" />
          Bouton Discord
        </label>
        {data.showDiscord && (
          <input
            placeholder="https://discord.gg/ton-serveur"
            value={data.discordUrl ?? ""}
            onChange={(e) => set("discordUrl", e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
      </div>

      <div className="field">
        <label className="switch">
          <input type="checkbox" checked={data.showWebsite} onChange={(e) => set("showWebsite", e.target.checked)} />
          <span className="track" />
          Bouton Site web
        </label>
        {data.showWebsite && (
          <input
            placeholder="https://ton-site.fr"
            value={data.websiteUrl ?? ""}
            onChange={(e) => set("websiteUrl", e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
      </div>
    </>
  );
}

/* =============================== Étape 3 =============================== */
function StepMinecraft({ data, set }: StepProps) {
  const [advanced, setAdvanced] = useState(false);
  const [versions, setVersions] = useState<string[]>(FALLBACK_VERSIONS);
  const [snapshots, setSnapshots] = useState(false);

  useEffect(() => {
    let active = true;
    fetchReleaseVersions(snapshots).then((v) => {
      if (active) setVersions(v);
    });
    return () => {
      active = false;
    };
  }, [snapshots]);

  return (
    <>
      <h3 style={{ marginTop: 0 }}>3 · Configuration Minecraft</h3>
      <p className="muted" style={{ marginTop: -6 }}>
        Choisis la version et le type de serveur. Pas d&apos;inquiétude, tout est expliqué.
      </p>

      <div className="grid cols-2">
        <div className="field">
          <label>Version Minecraft <span className="pill">{versions.length} dispo</span></label>
          <input list="mc-versions" value={data.mcVersion} onChange={(e) => set("mcVersion", e.target.value)} />
          <datalist id="mc-versions">
            {versions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <label className="switch" style={{ marginTop: 8, fontWeight: 400 }}>
            <input type="checkbox" checked={snapshots} onChange={(e) => setSnapshots(e.target.checked)} />
            <span className="track" />
            Inclure les snapshots
          </label>
        </div>
        <div className="field">
          <label>Type de launcher</label>
          <select value={data.launcherType} onChange={(e) => set("launcherType", e.target.value as LauncherFormData["launcherType"])}>
            <option value="vanilla">Vanilla</option>
            <option value="modded">Moddé</option>
            <option value="private">Serveur privé</option>
            <option value="minigames">Mini-jeux</option>
            <option value="survival">Survie</option>
            <option value="rp">Roleplay</option>
          </select>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="field">
          <label>Mod loader</label>
          <select value={data.loader} onChange={(e) => set("loader", e.target.value as LauncherFormData["loader"])}>
            <option value="vanilla">Aucun (vanilla)</option>
            <option value="fabric">Fabric</option>
            <option value="forge">Forge</option>
            <option value="quilt">Quilt</option>
            <option value="neoforge">NeoForge</option>
          </select>
          <div className="hint">Fabric et Quilt sont gérés automatiquement.</div>
        </div>
        <div className="field">
          <label>Version du loader</label>
          <input
            placeholder="auto"
            value={data.loaderVersion ?? ""}
            onChange={(e) => set("loaderVersion", e.target.value)}
          />
          <div className="hint">Laisse vide pour la dernière version.</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="field">
          <label>Adresse du serveur</label>
          <input
            placeholder="play.monserveur.fr"
            value={data.serverAddress ?? ""}
            onChange={(e) => set("serverAddress", e.target.value)}
          />
          <div className="hint">Optionnel. Affiché dans le launcher.</div>
        </div>
        <div className="field">
          <label>Port du serveur</label>
          <input
            type="number"
            placeholder="25565"
            value={data.serverPort ?? ""}
            onChange={(e) => set("serverPort", e.target.value ? parseInt(e.target.value) : null)}
          />
          <div className="hint">Par défaut : 25565.</div>
        </div>
      </div>

      <div className="field">
        <label>Message avant lancement</label>
        <input
          placeholder="Ex : Bon jeu sur Skyblock Légendaire !"
          value={data.preLaunchMessage}
          onChange={(e) => set("preLaunchMessage", e.target.value)}
        />
      </div>

      <div className="grid cols-2">
        <div className="field">
          <label>RAM minimale : {data.memMin} Mo</label>
          <input
            type="range"
            min={512}
            max={16384}
            step={512}
            value={data.memMin}
            onChange={(e) => set("memMin", parseInt(e.target.value))}
          />
        </div>
        <div className="field">
          <label>RAM maximale : {data.memMax} Mo</label>
          <input
            type="range"
            min={1024}
            max={32768}
            step={512}
            value={data.memMax}
            onChange={(e) => set("memMax", parseInt(e.target.value))}
          />
          <div className="hint">Recommandé : 4096 Mo pour un serveur moddé.</div>
        </div>
      </div>

      <button className="btn ghost sm" type="button" onClick={() => setAdvanced((a) => !a)}>
        {advanced ? "▾" : "▸"} Arguments avancés (JVM)
      </button>
      {advanced && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>Arguments JVM (un par ligne)</label>
          <textarea
            value={data.jvmArgs.join("\n")}
            placeholder="-XX:+UseG1GC&#10;-XX:MaxGCPauseMillis=200"
            onChange={(e) => set("jvmArgs", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          />
          <div className="hint">Pour utilisateurs avancés uniquement.</div>
        </div>
      )}
    </>
  );
}

/* =============================== Étape 4 =============================== */
function StepContent({ data, set }: StepProps) {
  return (
    <>
      <h3 style={{ marginTop: 0 }}>4 · Mods & ressources</h3>
      <p className="muted" style={{ marginTop: -6 }}>
        Contenu installé automatiquement avec le launcher chez tes joueurs.
      </p>
      <FileListEditor
        label="Mods"
        hint="Colle l'URL directe du .jar (ex : lien de téléchargement Modrinth)."
        items={data.mods}
        onChange={(v) => set("mods", v)}
      />
      <hr className="hr" />
      <FileListEditor
        label="Resource packs"
        items={data.resourcepacks}
        onChange={(v) => set("resourcepacks", v)}
      />
      <hr className="hr" />
      <FileListEditor
        label="Shader packs"
        items={data.shaderpacks}
        onChange={(v) => set("shaderpacks", v)}
      />
    </>
  );
}

/* =============================== Étape 5 =============================== */
function StepNews({ data, set }: StepProps) {
  return (
    <>
      <h3 style={{ marginTop: 0 }}>5 · Actualités du launcher</h3>
      <p className="muted" style={{ marginTop: -6 }}>
        Annonce tes mises à jour, events et patch notes directement dans le launcher.
      </p>
      <NewsEditor items={data.news} onChange={(v) => set("news", v)} />
    </>
  );
}

/* =============================== Étape 6 : Communauté =============================== */
const AMBIANCES: { id: LauncherFormData["ambiance"]; label: string }[] = [
  { id: "none", label: "Aucune" },
  { id: "fire", label: "🔥 Feu (faction)" },
  { id: "snow", label: "❄️ Neige (survie)" },
  { id: "stars", label: "✨ Étoiles (fantasy)" },
  { id: "rain", label: "🌧️ Pluie (RP)" },
  { id: "glitch", label: "👾 Glitch (futuriste)" },
];

function StepCommunity({ data, set }: StepProps) {
  const events = data.events;
  const patch = data.patchNotes;

  function updEvent(i: number, p: Partial<(typeof events)[number]>) {
    const next = [...events];
    next[i] = { ...next[i], ...p };
    set("events", next);
  }
  function updPatch(i: number, p: Partial<(typeof patch)[number]>) {
    const next = [...patch];
    next[i] = { ...next[i], ...p };
    set("patchNotes", next);
  }

  return (
    <>
      <h3 style={{ marginTop: 0 }}>6 · Communauté & serveur</h3>
      <p className="muted" style={{ marginTop: -6 }}>
        Transforme ton launcher en centre de vie du serveur.
      </p>

      {/* Ambiance */}
      <div className="field">
        <label>Ambiance animée du fond</label>
        <div className="choice-grid">
          {AMBIANCES.map((a) => (
            <div key={a.id} className={`choice ${data.ambiance === a.id ? "active" : ""}`} onClick={() => set("ambiance", a.id)}>
              <div className="name">{a.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bannière d'alerte */}
      <div className="card tight" style={{ marginBottom: 14 }}>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.alert.active}
            onChange={(e) => set("alert", { ...data.alert, active: e.target.checked })}
          />
          <span className="track" />
          Bannière d&apos;alerte prioritaire
        </label>
        {data.alert.active && (
          <div className="grid cols-2" style={{ gap: 10, marginTop: 10 }}>
            <select value={data.alert.kind} onChange={(e) => set("alert", { ...data.alert, kind: e.target.value as typeof data.alert.kind })}>
              <option value="info">Info</option>
              <option value="warn">Avertissement</option>
              <option value="update">Mise à jour</option>
            </select>
            <input
              placeholder="Ex : Maintenance ce soir à 21h"
              value={data.alert.message}
              onChange={(e) => set("alert", { ...data.alert, message: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Maintenance */}
      <div className="card tight" style={{ marginBottom: 14 }}>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.maintenance.active}
            onChange={(e) => set("maintenance", { ...data.maintenance, active: e.target.checked })}
          />
          <span className="track" />
          Mode maintenance (désactive le bouton Jouer)
        </label>
        {data.maintenance.active && (
          <div className="grid cols-2" style={{ gap: 10, marginTop: 10 }}>
            <input
              placeholder="Raison (optionnel)"
              value={data.maintenance.reason ?? ""}
              onChange={(e) => set("maintenance", { ...data.maintenance, reason: e.target.value || undefined })}
            />
            <input
              placeholder="Retour prévu (ex : 18h30)"
              value={data.maintenance.until ?? ""}
              onChange={(e) => set("maintenance", { ...data.maintenance, until: e.target.value || undefined })}
            />
          </div>
        )}
      </div>

      {/* Lien support */}
      <div className="field">
        <label>Lien de support</label>
        <input
          placeholder="https://discord.gg/… ou page support"
          value={data.supportUrl ?? ""}
          onChange={(e) => set("supportUrl", e.target.value || null)}
        />
        <div className="hint">Utilisé par le bouton « J&apos;ai un problème » du launcher.</div>
      </div>

      <hr className="hr" />

      {/* Événements */}
      <div className="row spread" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          Événements <span className="pill">{events.length}</span>
        </label>
        <button className="btn secondary sm" type="button" onClick={() => set("events", [...events, emptyEvent()])}>
          + Ajouter un événement
        </button>
      </div>
      {events.map((ev, i) => (
        <div className="card tight" key={ev.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="grid cols-2" style={{ gap: 10 }}>
                <input placeholder="Titre (Event Donjon)" value={ev.title} onChange={(e) => updEvent(i, { title: e.target.value })} />
                <input type="datetime-local" value={ev.startsAt} onChange={(e) => updEvent(i, { startsAt: e.target.value })} />
              </div>
              <textarea placeholder="Description" value={ev.description} onChange={(e) => updEvent(i, { description: e.target.value })} style={{ marginTop: 8, minHeight: 50 }} />
              <div className="grid cols-2" style={{ gap: 10, marginTop: 8 }}>
                <input placeholder="Récompenses (optionnel)" value={ev.rewards ?? ""} onChange={(e) => updEvent(i, { rewards: e.target.value || undefined })} />
                <input placeholder="URL image (optionnel)" value={ev.imageUrl ?? ""} onChange={(e) => updEvent(i, { imageUrl: e.target.value || undefined })} />
              </div>
              <div className="grid cols-2" style={{ gap: 10, marginTop: 8 }}>
                <input placeholder="Texte du bouton" value={ev.buttonLabel ?? ""} onChange={(e) => updEvent(i, { buttonLabel: e.target.value || undefined })} />
                <input placeholder="Lien du bouton" value={ev.buttonUrl ?? ""} onChange={(e) => updEvent(i, { buttonUrl: e.target.value || undefined })} />
              </div>
            </div>
            <button className="icon-btn" type="button" onClick={() => set("events", events.filter((_, idx) => idx !== i))}>
              ✕
            </button>
          </div>
        </div>
      ))}

      <hr className="hr" />

      {/* Patch notes */}
      <div className="row spread" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          Notes de mise à jour <span className="pill">{patch.length}</span>
        </label>
        <button className="btn secondary sm" type="button" onClick={() => set("patchNotes", [...patch, emptyPatchNote()])}>
          + Ajouter une note
        </button>
      </div>
      {patch.map((pn, i) => (
        <div className="card tight" key={pn.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="grid cols-2" style={{ gap: 10 }}>
                <input placeholder="Version (1.2.0)" value={pn.version} onChange={(e) => updPatch(i, { version: e.target.value })} />
                <input type="date" value={pn.date} onChange={(e) => updPatch(i, { date: e.target.value })} />
              </div>
              <textarea
                placeholder="Une modification par ligne&#10;+ Nouveau donjon&#10;- Correction de bugs"
                value={pn.lines.join("\n")}
                onChange={(e) => updPatch(i, { lines: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                style={{ marginTop: 8, minHeight: 70 }}
              />
            </div>
            <button className="icon-btn" type="button" onClick={() => set("patchNotes", patch.filter((_, idx) => idx !== i))}>
              ✕
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

/* =============================== Étape 7 =============================== */
function StepFinal({
  data,
  generating,
  generated,
  manifestUrl,
  onGenerate,
  onEdit,
}: {
  data: LauncherFormData;
  generating: boolean;
  generated: boolean;
  manifestUrl: string;
  onGenerate: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <h3 style={{ marginTop: 0 }}>7 · Aperçu final & génération</h3>
      <p className="muted" style={{ marginTop: -6 }}>
        Vérifie le rendu à droite. Quand tout est bon, génère ton launcher.
      </p>

      <div className="card tight" style={{ marginBottom: 16 }}>
        <div className="row spread">
          <div>
            <div style={{ fontWeight: 700 }}>{data.title || "Sans nom"}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {data.mcVersion} · {data.loader} · {data.mods.length} mod(s) · {data.news.length} actu(s)
            </div>
          </div>
          <span className={`badge ${data.status}`}>
            <span className="dot" />
            {data.status === "published" ? "Publié" : data.status === "ready" ? "Prêt" : "Brouillon"}
          </span>
        </div>
      </div>

      {generating && (
        <div className="field">
          <div className="progress-track">
            <div className="progress-fill shimmer" style={{ width: "100%" }} />
          </div>
          <div className="hint">Génération du manifeste…</div>
        </div>
      )}

      {generated ? (
        <div className="card tight" style={{ borderColor: "var(--brand)" }}>
          <div style={{ fontWeight: 700, color: "var(--brand)", marginBottom: 8 }}>
            ✓ Launcher généré et publié !
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Tes joueurs ouvrent YourLauncher et entrent le code :
          </p>
          <div style={{ fontSize: 22, marginBottom: 12 }}>
            <code>{data.slug}</code>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <a className="btn" href={`/api/manifest/${data.slug}?download=1`} download>
              ⬇ Télécharger le manifest.json
            </a>
            <a className="btn secondary" href={manifestUrl} target="_blank" rel="noreferrer">
              Voir le manifeste
            </a>
            <button className="btn ghost" onClick={onEdit}>
              Modifier encore
            </button>
          </div>
        </div>
      ) : (
        <div className="row" style={{ gap: 12 }}>
          <button className="btn ghost" onClick={onEdit}>
            ← Modifier
          </button>
          <button className="btn lg" onClick={onGenerate} disabled={generating}>
            🚀 Générer le launcher
          </button>
        </div>
      )}
    </>
  );
}
