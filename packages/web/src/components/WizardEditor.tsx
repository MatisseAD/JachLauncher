"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  DownloadableFile,
  NewsEntry,
  EventEntry,
  PatchNote,
} from "@jach/shared";
import {
  DEFAULT_FORM,
  emptyEvent,
  emptyPatchNote,
  type LauncherFormData,
} from "@/lib/launcher-types";
import { PRESETS } from "@/lib/presets";
import UiIcon, { type UiIconName } from "./UiIcon";
import LauncherPreview from "./LauncherPreview";
import AssetUpload from "./editor/AssetUpload";
import FileListEditor from "./editor/FileListEditor";
import ContentCatalogEditor from "./editor/ContentCatalogEditor";
import NewsEditor from "./editor/NewsEditor";
import { fetchReleaseVersions, FALLBACK_VERSIONS } from "@/lib/mc-versions";
import { useI18n } from "@/i18n/I18nProvider";
import { getGuideContent } from "@/i18n/guide-content";
import { getWizardCopy } from "@/i18n/wizard-content";
import { LatestSaveQueue } from "@/lib/latest-save-queue";

const STEPS: {
  short: string;
  title: string;
  description: string;
  icon: UiIconName;
}[] = [
  {
    short: "Modèle",
    title: "Choisis ton point de départ",
    description:
      "Pars d’un univers prêt à personnaliser. Tu pourras modifier chaque détail ensuite.",
    icon: "sparkles",
  },
  {
    short: "Identité",
    title: "Donne-lui une identité",
    description:
      "Définis le nom public, le code que tes joueurs saisiront et une courte présentation.",
    icon: "user",
  },
  {
    short: "Design",
    title: "Crée son univers visuel",
    description:
      "Ajoute tes visuels, choisis les couleurs et façonne l’interface sans toucher au code.",
    icon: "settings",
  },
  {
    short: "Minecraft",
    title: "Configure Minecraft",
    description:
      "Choisis la version, le loader, le serveur et la mémoire recommandée pour tes joueurs.",
    icon: "server",
  },
  {
    short: "Contenu",
    title: "Ajoute le contenu à installer",
    description:
      "Mods, packs de ressources et shaders seront téléchargés et vérifiés automatiquement.",
    icon: "layers",
  },
  {
    short: "Actualités",
    title: "Prépare l’accueil des joueurs",
    description:
      "Publie une première actualité ou garde cette section vide pour la compléter plus tard.",
    icon: "activity",
  },
  {
    short: "Communauté",
    title: "Relie ta communauté",
    description:
      "Ajoute Discord, ton site, le support et une ambiance adaptée à ton serveur.",
    icon: "users",
  },
  {
    short: "Serveur",
    title: "Anime la vie du serveur",
    description:
      "Gère les alertes, maintenances, événements et notes de mise à jour.",
    icon: "shield",
  },
  {
    short: "Publication",
    title: "Vérifie et publie",
    description:
      "Relis l’essentiel, contrôle l’aperçu puis partage le code du launcher.",
    icon: "rocket",
  },
];

const REQUIRED_STEPS = [1, 3, 4, 5, 6, 7];

function isHttpUrl(value?: string | null) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateStep(index: number, data: LauncherFormData): string | null {
  if (index === 1) {
    if (data.title.trim().length < 3) {
      return "Choisis un nom d’au moins 3 caractères.";
    }
    if (!/^[a-z0-9-]{3,40}$/.test(data.slug)) {
      return "Le code doit contenir 3 à 40 lettres minuscules, chiffres ou tirets.";
    }
  }

  if (index === 3) {
    if (!data.mcVersion.trim()) return "Choisis une version de Minecraft.";
    if (data.memMin > data.memMax) {
      return "La RAM minimale ne peut pas dépasser la RAM maximale.";
    }
    if (
      data.serverPort != null &&
      (data.serverPort < 1 || data.serverPort > 65535)
    ) {
      return "Le port du serveur doit être compris entre 1 et 65535.";
    }
  }

  if (index === 4) {
    const incomplete = [
      ...data.mods,
      ...data.resourcepacks,
      ...data.shaderpacks,
    ].find(
      (file) =>
        !file.name.trim() ||
        !file.fileName.trim() ||
        !isHttpUrl(file.url) ||
        !/^[0-9a-f]{64}$/i.test(file.sha256) ||
        file.size <= 0,
    );
    if (incomplete) {
      return `L’import manuel « ${incomplete.name || incomplete.fileName || "sans nom"} » est incomplet. Ouvre la section avancée pour le corriger.`;
    }
  }

  if (index === 5 && data.news.some((item) => !item.title.trim())) {
    return "Chaque actualité ajoutée doit avoir un titre.";
  }

  if (index === 6) {
    if (data.showDiscord && !isHttpUrl(data.discordUrl)) {
      return "Ajoute une URL Discord valide ou désactive le bouton Discord.";
    }
    if (data.showWebsite && !isHttpUrl(data.websiteUrl)) {
      return "Ajoute une URL de site valide ou désactive le bouton Site web.";
    }
    if (!isHttpUrl(data.supportUrl)) {
      return "Le lien de support doit être une URL valide.";
    }
  }

  if (index === 7) {
    if (data.alert.active && !data.alert.message.trim()) {
      return "Ajoute un message à la bannière d’alerte.";
    }
    if (
      data.events.some((event) => !event.title.trim() || !event.startsAt.trim())
    ) {
      return "Chaque événement ajouté doit avoir un titre et une date.";
    }
    if (data.patchNotes.some((note) => !note.version.trim())) {
      return "Chaque note de mise à jour doit indiquer une version.";
    }
  }

  return null;
}

function slugify(s: string): string {
  const stripped = s
    .normalize("NFD")
    .split("")
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return stripped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Nettoie l'état avant envoi (filtre les entrées incomplètes, vide -> null). */
function sanitize(d: LauncherFormData) {
  const cleanFiles = (arr: DownloadableFile[]) =>
    arr.filter(
      (f) =>
        f.url &&
        /^https?:\/\//i.test(f.url) &&
        f.fileName &&
        /^[0-9a-f]{64}$/i.test(f.sha256) &&
        f.size > 0,
    );
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
  const { locale } = useI18n();
  const wizardCopy = getWizardCopy(locale);
  const guideCopy = getGuideContent(locale);
  const localizedSteps = STEPS.map((item, index) => ({
    ...item,
    short: wizardCopy.shorts[index] ?? item.short,
    title: guideCopy.steps[index]?.title ?? item.title,
    description: guideCopy.steps[index]?.desc ?? item.description,
  }));
  const [data, setData] = useState<LauncherFormData>(initial ?? DEFAULT_FORM);
  const [step, setStep] = useState(0);
  const [unlockedStep, setUnlockedStep] = useState(
    mode === "edit" ? STEPS.length - 1 : 0,
  );
  const [selectedPreset, setSelectedPreset] = useState("premium-dark");
  const [stepError, setStepError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [saveError, setSaveError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const mounted = useRef(false);
  const canUpdateUi = useRef(true);
  const dataRef = useRef(data);
  const launcherIdRef = useRef(data.id ?? null);
  const editVersion = useRef(0);
  const queuedVersion = useRef(0);
  const latestRequest = useRef(0);
  const blockedSlug = useRef<string | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const saveQueue = useRef<LatestSaveQueue<
    {
      payload: ReturnType<typeof sanitize>;
      requestId: number;
      keepalive: boolean;
    },
    string | null
  > | null>(null);

  if (!saveQueue.current) {
    saveQueue.current = new LatestSaveQueue(async (request) => {
      const isLatestRequest = () => request.requestId === latestRequest.current;
      const updateUi = (callback: () => void) => {
        if (canUpdateUi.current && isLatestRequest()) callback();
      };
      const launcherId = launcherIdRef.current ?? request.payload.id ?? null;

      if (blockedSlug.current === request.payload.slug) {
        updateUi(() => {
          setSave("error");
          setSaveError("Ce code de launcher est déjà utilisé.");
        });
        return null;
      }

      if (!launcherId) {
        if (
          !request.payload.title.trim() ||
          !/^[a-z0-9-]{3,40}$/.test(request.payload.slug)
        ) {
          updateUi(() => setSave("idle"));
          return null;
        }
      }

      try {
        const response = await fetch(
          launcherId ? `/api/launchers/${launcherId}` : "/api/launchers",
          {
            method: launcherId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.payload),
            keepalive: request.keepalive,
          },
        );
        const json = (await response.json().catch(() => ({}))) as {
          id?: string;
          error?: string;
        };
        if (!response.ok) {
          if (
            response.status === 409 &&
            json.error?.toLowerCase().includes("slug")
          ) {
            blockedSlug.current = request.payload.slug;
          }
          updateUi(() => {
            setSave("error");
            setSaveError(json.error ?? "Erreur de sauvegarde");
          });
          return null;
        }

        const savedLauncherId = launcherId ?? json.id ?? null;
        if (!savedLauncherId) {
          updateUi(() => {
            setSave("error");
            setSaveError("Identifiant absent de la réponse.");
          });
          return null;
        }

        if (!launcherIdRef.current) {
          launcherIdRef.current = savedLauncherId;
          const withId = { ...dataRef.current, id: savedLauncherId };
          dataRef.current = withId;
          if (canUpdateUi.current) {
            setData(withId);
            window.history.replaceState(
              null,
              "",
              `/dashboard/${savedLauncherId}`,
            );
          }
        }
        blockedSlug.current = null;
        updateUi(() => setSave("saved"));
        return savedLauncherId;
      } catch (error) {
        updateUi(() => {
          setSave("error");
          setSaveError(
            error instanceof Error ? error.message : "Connexion impossible",
          );
        });
        return null;
      }
    });
  }

  function set<K extends keyof LauncherFormData>(
    key: K,
    value: LauncherFormData[K],
  ) {
    setStepError("");
    editVersion.current += 1;
    const next = { ...dataRef.current, [key]: value };
    dataRef.current = next;
    setData(next);
  }
  function patch(p: Partial<LauncherFormData>) {
    setStepError("");
    editVersion.current += 1;
    const next = { ...dataRef.current, ...p };
    dataRef.current = next;
    setData(next);
  }

  // --- Sauvegarde automatique (debounce) ---
  function persist(options: { keepalive?: boolean; silent?: boolean } = {}) {
    queuedVersion.current = Math.max(
      queuedVersion.current,
      editVersion.current,
    );
    const requestId = ++latestRequest.current;
    if (!options.silent && canUpdateUi.current) {
      setSave("saving");
      setSaveError("");
    }
    return saveQueue.current!.enqueue({
      payload: sanitize(dataRef.current),
      requestId,
      keepalive: options.keepalive ?? false,
    });
  }

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (editVersion.current <= queuedVersion.current) return;
    setSave("saving");
    const t = setTimeout(() => void persist(), 900);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    const flushPendingSave = () => {
      if (editVersion.current > queuedVersion.current) {
        void persist({ keepalive: true, silent: true });
      }
    };

    window.addEventListener("pagehide", flushPendingSave);
    return () => {
      window.removeEventListener("pagehide", flushPendingSave);
      flushPendingSave();
      canUpdateUi.current = false;
    };
  }, []);

  async function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      patch(preset.apply);
    }
  }

  async function generate() {
    const invalidStep = REQUIRED_STEPS.find((index) =>
      validateStep(index, data),
    );
    if (invalidStep !== undefined) {
      setStep(invalidStep);
      setUnlockedStep((current) => Math.max(current, invalidStep));
      setStepError(validateStep(invalidStep, data) ?? "");
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setGenerating(true);
    try {
      const launcherId = await persist();
      if (!launcherId) return;
      const response = await fetch(`/api/launchers/${launcherId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setSave("error");
        setSaveError(json.error ?? "Publication impossible.");
        return;
      }
      set("status", "published");
      setGenerated(true);
    } catch (error) {
      setSave("error");
      setSaveError(
        error instanceof Error ? error.message : "Publication impossible.",
      );
    } finally {
      setGenerating(false);
    }
  }

  const manifestUrl =
    typeof window !== "undefined" && data.slug
      ? `${window.location.origin}/api/manifest/${data.slug}`
      : "";
  const currentStep = localizedSteps[step];
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  function showStep(index: number) {
    if (index > unlockedStep) return;
    setStep(index);
    setStepError("");
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function goNext() {
    const error = validateStep(step, data);
    if (error) {
      setStepError(error);
      return;
    }

    if (step === 1 && !data.id) {
      const launcherId = await persist();
      if (!launcherId) return;
    }

    const nextStep = Math.min(step + 1, STEPS.length - 1);
    setUnlockedStep((current) => Math.max(current, nextStep));
    setStep(nextStep);
    setStepError("");
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="wizard-workspace">
      <aside className="wizard-rail">
        <div className="wizard-progress-copy">
          <span>
            {wizardCopy.step} {step + 1} {wizardCopy.of} {STEPS.length}
          </span>
          <strong>{progress}%</strong>
        </div>
        <div
          className="wizard-progress-track"
          role="progressbar"
          aria-label={wizardCopy.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        <nav className="wizard-steps" aria-label={wizardCopy.stepsLabel}>
          {localizedSteps.map((item, index) => {
            const active = index === step;
            const done = index < step;
            const locked = index > unlockedStep;
            return (
              <button
                type="button"
                key={item.short}
                className={`wizard-step ${active ? "active" : ""} ${done ? "done" : ""}`}
                onClick={() => showStep(index)}
                disabled={locked}
                aria-current={active ? "step" : undefined}
              >
                <span className="wizard-step-icon">
                  {done ? (
                    <UiIcon name="check" size={16} />
                  ) : (
                    <UiIcon name={item.icon} size={17} />
                  )}
                </span>
                <span>
                  <small>
                    {wizardCopy.step} {index + 1}
                  </small>
                  <strong>{item.short}</strong>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="wizard-reassurance">
          <UiIcon name="shield" size={17} />
          <span>{wizardCopy.reassurance}</span>
        </div>
      </aside>

      <section className="wizard-stage" ref={stageRef}>
        <header className="wizard-stage-heading">
          <div>
            <span className="page-kicker">
              {wizardCopy.step} {step + 1} · {currentStep.short}
            </span>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.description}</p>
          </div>
          <button
            type="button"
            className="btn ghost sm wizard-preview-toggle"
            onClick={() => setPreviewOpen((open) => !open)}
          >
            {previewOpen ? wizardCopy.hidePreview : wizardCopy.showPreview}
          </button>
        </header>

        <div className="card wizard-card">
          {step === 0 && (
            <StepTemplate
              selectedPreset={selectedPreset}
              applyPreset={applyPreset}
            />
          )}
          {step === 1 && <StepIdentity data={data} set={set} patch={patch} />}
          {step === 2 && <StepAppearance data={data} set={set} />}
          {step === 3 && <StepMinecraft data={data} set={set} />}
          {step === 4 && <StepContent data={data} set={set} />}
          {step === 5 && <StepNews data={data} set={set} />}
          {step === 6 && <StepCommunity data={data} set={set} />}
          {step === 7 && <StepOperations data={data} set={set} />}
          {step === 8 && (
            <StepFinal
              data={data}
              generating={generating}
              generated={generated}
              manifestUrl={manifestUrl}
              onGenerate={generate}
              onEdit={() => showStep(1)}
            />
          )}
        </div>

        {(stepError || saveError) && (
          <div className="wizard-error" role="alert">
            <UiIcon name="help" size={18} />
            <span>{stepError || saveError}</span>
          </div>
        )}

        <footer className="wizard-navigation">
          <button
            type="button"
            className="btn ghost"
            disabled={step === 0}
            onClick={() => showStep(Math.max(0, step - 1))}
          >
            ← {wizardCopy.previous}
          </button>

          <div className="wizard-navigation-end">
            <AutosaveIndicator save={save} error="" copy={wizardCopy} />
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn" onClick={goNext}>
                {wizardCopy.continue}
                <UiIcon name="arrow" size={17} />
              </button>
            ) : (
              <Link className="btn ghost" href="/dashboard">
                {wizardCopy.dashboard}
              </Link>
            )}
          </div>
        </footer>
      </section>

      <aside
        className={`wizard-preview ${previewOpen ? "is-open" : ""}`}
        aria-label={wizardCopy.livePreview}
      >
        <div className="wizard-preview-heading">
          <div>
            <span className="status-dot" />
            <strong>{wizardCopy.livePreview}</strong>
          </div>
          {data.id && (
            <Link
              className="btn ghost sm"
              href={`/preview/${data.slug}`}
              target="_blank"
            >
              {wizardCopy.fullscreen}
              <UiIcon name="external" size={14} />
            </Link>
          )}
        </div>
        <LauncherPreview data={data} />
        <p>{wizardCopy.previewText}</p>
      </aside>
    </div>
  );
}

/* =========================== Indicateur autosave =========================== */
function AutosaveIndicator({
  save,
  error,
  copy,
}: {
  save: string;
  error: string;
  copy: ReturnType<typeof getWizardCopy>;
}) {
  if (save === "error")
    return <span className="error">⚠ {error || copy.saveError}</span>;
  if (save === "saving")
    return (
      <span className="autosave saving">
        <span className="dot" /> {copy.saving}
      </span>
    );
  if (save === "saved")
    return (
      <span className="autosave">
        <span className="dot" /> {copy.saved}
      </span>
    );
  return <span className="autosave faint">{copy.autosaved}</span>;
}

/* =============================== Étape 1 =============================== */
type StepProps = {
  data: LauncherFormData;
  set: <K extends keyof LauncherFormData>(k: K, v: LauncherFormData[K]) => void;
};

function StepTemplate({
  selectedPreset,
  applyPreset,
}: {
  selectedPreset: string;
  applyPreset: (id: string) => void;
}) {
  return (
    <div className="preset-grid">
      {PRESETS.map((preset) => (
        <button
          type="button"
          key={preset.id}
          className={`preset-card ${selectedPreset === preset.id ? "active" : ""}`}
          onClick={() => applyPreset(preset.id)}
          aria-pressed={selectedPreset === preset.id}
        >
          <span
            className="preset-card-visual"
            style={{
              background: `linear-gradient(135deg, ${preset.apply.primaryColor}, ${preset.apply.secondaryColor})`,
            }}
          >
            <span>{preset.emoji}</span>
            {selectedPreset === preset.id && (
              <span className="preset-selected">
                <UiIcon name="check" size={14} />
              </span>
            )}
          </span>
          <span className="preset-card-copy">
            <strong>{preset.name}</strong>
            <small>{preset.description}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function StepIdentity({
  data,
  set,
  patch,
}: StepProps & {
  patch: (p: Partial<LauncherFormData>) => void;
}) {
  return (
    <>
      <div className="grid cols-2">
        <div className="field">
          <label htmlFor="launcher-title">Nom du launcher</label>
          <input
            id="launcher-title"
            autoFocus
            value={data.title}
            placeholder="Ex : Skyblock Légendaire"
            maxLength={60}
            onChange={(e) => {
              const title = e.target.value;
              patch({
                title,
                slug:
                  !data.id && (!data.slug || data.slug === slugify(data.title))
                    ? slugify(title)
                    : data.slug,
              });
            }}
          />
          <div className="hint">Visible en haut de l’application.</div>
        </div>
        <div className="field">
          <label htmlFor="launcher-slug">Code joueur</label>
          <input
            id="launcher-slug"
            value={data.slug}
            placeholder="skyblock-legendaire"
            maxLength={40}
            onChange={(e) => set("slug", slugify(e.target.value))}
          />
          <div className="hint">Tes joueurs saisiront exactement ce code.</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="launcher-description">
          Description courte <span className="field-optional">facultatif</span>
        </label>
        <textarea
          id="launcher-description"
          value={data.description}
          placeholder="Ex : Le meilleur serveur Skyblock francophone, mis à jour chaque semaine."
          maxLength={280}
          onChange={(e) => set("description", e.target.value)}
        />
        <div className="field-counter">{data.description.length}/280</div>
      </div>

      <div className="wizard-tip">
        <UiIcon name="help" size={18} />
        <div>
          <strong>À quoi sert le code joueur ?</strong>
          <p>
            Il permet de retrouver ta configuration depuis l’application
            YourLauncher. Utilise un code court et facile à partager.
          </p>
        </div>
      </div>
    </>
  );
}

/* =============================== Étape 2 =============================== */
function StepAppearance({ data, set }: StepProps) {
  return (
    <>
      <div className="asset-grid">
        <AssetUpload
          label="Logo"
          kind="logo"
          value={data.logoUrl}
          launcherId={data.id}
          onChange={(value) => set("logoUrl", value)}
          hint="Carré ou transparent, 512 × 512 conseillé."
        />
        <AssetUpload
          label="Image de fond"
          kind="background"
          value={data.backgroundUrl}
          launcherId={data.id}
          onChange={(value) => set("backgroundUrl", value)}
          hint="Paysage 1920 × 1080 conseillé."
        />
      </div>

      <details className="advanced-disclosure">
        <summary>Personnaliser davantage le design</summary>
        <p className="hint">
          Le modèle choisi est déjà prêt. Ouvre cette section uniquement si tu
          veux ajuster le cadrage, les couleurs ou la disposition.
        </p>
        <div className="customization-block">
          <div className="customization-heading">
            <div>
              <strong>Lisibilité du fond</strong>
              <span>
                Ajuste le cadrage et la profondeur sans modifier ton image.
              </span>
            </div>
            <span className="pill">
              {data.backgroundOverlay}% d’assombrissement
            </span>
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label>Recadrage</label>
              <select
                value={data.backgroundFit}
                onChange={(event) =>
                  set(
                    "backgroundFit",
                    event.target.value as LauncherFormData["backgroundFit"],
                  )
                }
              >
                <option value="cover">Remplir sans déformer</option>
                <option value="contain">Afficher l’image entière</option>
                <option value="fill">Étirer dans la fenêtre</option>
              </select>
            </div>
            <div className="field">
              <label>Point focal</label>
              <select
                value={data.backgroundPosition}
                onChange={(event) =>
                  set(
                    "backgroundPosition",
                    event.target
                      .value as LauncherFormData["backgroundPosition"],
                  )
                }
              >
                <option value="center">Centre</option>
                <option value="top">Haut</option>
                <option value="bottom">Bas</option>
                <option value="left">Gauche</option>
                <option value="right">Droite</option>
              </select>
            </div>
          </div>
          <div className="range-grid">
            <label className="range-field">
              <span>
                Assombrissement <strong>{data.backgroundOverlay}%</strong>
              </span>
              <input
                type="range"
                min={0}
                max={90}
                value={data.backgroundOverlay}
                onChange={(event) =>
                  set("backgroundOverlay", Number(event.target.value))
                }
              />
            </label>
            <label className="range-field">
              <span>
                Flou du fond <strong>{data.backgroundBlur}px</strong>
              </span>
              <input
                type="range"
                min={0}
                max={20}
                value={data.backgroundBlur}
                onChange={(event) =>
                  set("backgroundBlur", Number(event.target.value))
                }
              />
            </label>
            <label className="range-field">
              <span>
                Opacité des panneaux <strong>{data.panelOpacity}%</strong>
              </span>
              <input
                type="range"
                min={20}
                max={100}
                value={data.panelOpacity}
                onChange={(event) =>
                  set("panelOpacity", Number(event.target.value))
                }
              />
            </label>
            <label className="range-field">
              <span>
                Coins des cartes <strong>{data.cornerRadius}px</strong>
              </span>
              <input
                type="range"
                min={0}
                max={32}
                value={data.cornerRadius}
                onChange={(event) =>
                  set("cornerRadius", Number(event.target.value))
                }
              />
            </label>
          </div>
        </div>

        <div className="field">
          <label>Style visuel</label>
          <div className="choice-grid visual-choice-grid">
            {(
              [
                "premium",
                "dark",
                "light",
                "pixel",
                "medieval",
                "futuristic",
              ] as const
            ).map((style) => (
              <button
                type="button"
                key={style}
                className={`choice ${data.visualStyle === style ? "active" : ""}`}
                onClick={() => set("visualStyle", style)}
              >
                <span className="style-swatch" data-style={style} />
                <span className="name">
                  {style === "premium"
                    ? "Premium"
                    : style === "dark"
                      ? "Sombre"
                      : style === "light"
                        ? "Clair"
                        : style === "pixel"
                          ? "Pixel"
                          : style === "medieval"
                            ? "Médiéval"
                            : "Futuriste"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="color-grid">
          {(
            [
              ["primaryColor", "Couleur principale"],
              ["secondaryColor", "Couleur secondaire"],
              ["textColor", "Couleur du texte"],
            ] as const
          ).map(([key, label]) => (
            <label className="color-field" key={key}>
              <span>{label}</span>
              <span>
                <input
                  type="color"
                  value={data[key]}
                  onChange={(event) => set(key, event.target.value)}
                />
                <code>{data[key]}</code>
              </span>
            </label>
          ))}
        </div>

        <div className="field">
          <label>Style du bouton Jouer</label>
          <div className="choice-grid">
            {(["glow", "flat", "pixel", "outline"] as const).map((style) => (
              <button
                type="button"
                key={style}
                className={`choice ${data.buttonStyle === style ? "active" : ""}`}
                onClick={() => set("buttonStyle", style)}
              >
                <div className="name" style={{ textTransform: "capitalize" }}>
                  {style}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label>Forme des cartes</label>
            <select
              value={data.cardShape}
              onChange={(e) =>
                set(
                  "cardShape",
                  e.target.value as LauncherFormData["cardShape"],
                )
              }
            >
              <option value="rounded">Arrondies</option>
              <option value="sharp">Carrées (pixel)</option>
              <option value="pill">Très arrondies</option>
            </select>
          </div>
          <div className="field">
            <label>Placement du menu</label>
            <select
              value={data.menuPlacement}
              onChange={(e) =>
                set(
                  "menuPlacement",
                  e.target.value as LauncherFormData["menuPlacement"],
                )
              }
            >
              <option value="left">À gauche</option>
              <option value="top">En haut</option>
            </select>
          </div>
          <div className="field">
            <label>Police du launcher</label>
            <select
              value={data.fontFamily}
              onChange={(event) =>
                set(
                  "fontFamily",
                  event.target.value as LauncherFormData["fontFamily"],
                )
              }
            >
              <option value="poppins">Poppins</option>
              <option value="inter">Inter</option>
              <option value="system">Système</option>
              <option value="serif">Serif fantasy</option>
              <option value="pixel">Pixel</option>
            </select>
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label>Thème</label>
            <select
              value={data.theme}
              onChange={(e) =>
                set("theme", e.target.value as LauncherFormData["theme"])
              }
            >
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </select>
          </div>
          <div className="field">
            <label>Densité de l’interface</label>
            <select
              value={data.contentDensity}
              onChange={(event) =>
                set(
                  "contentDensity",
                  event.target.value as LauncherFormData["contentDensity"],
                )
              }
            >
              <option value="compact">Compacte</option>
              <option value="comfortable">Confortable</option>
              <option value="spacious">Aérée</option>
            </select>
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label>Style du menu</label>
            <select
              value={data.sidebarStyle}
              onChange={(event) =>
                set(
                  "sidebarStyle",
                  event.target.value as LauncherFormData["sidebarStyle"],
                )
              }
            >
              <option value="glass">Verre dépoli</option>
              <option value="solid">Plein</option>
              <option value="floating">Flottant</option>
            </select>
          </div>
          <div className="field">
            <label>Forme du logo</label>
            <select
              value={data.logoShape}
              onChange={(event) =>
                set(
                  "logoShape",
                  event.target.value as LauncherFormData["logoShape"],
                )
              }
            >
              <option value="rounded">Arrondi</option>
              <option value="square">Carré</option>
              <option value="circle">Cercle</option>
            </select>
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="play-button-label">Texte du bouton principal</label>
            <input
              id="play-button-label"
              maxLength={24}
              value={data.playButtonLabel}
              placeholder="JOUER"
              onChange={(event) => set("playButtonLabel", event.target.value)}
            />
          </div>
          <label className="switch-row customization-switch">
            <input
              type="checkbox"
              checked={data.showServerStatus}
              onChange={(event) =>
                set("showServerStatus", event.target.checked)
              }
            />
            <span>
              <strong>Afficher l’état du serveur</strong>
              <small>Joueurs, latence, version et message du jour.</small>
            </span>
          </label>
        </div>
      </details>
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
      <div className="grid cols-2">
        <div className="field">
          <label>
            Version Minecraft{" "}
            <span className="pill">{versions.length} dispo</span>
          </label>
          <input
            list="mc-versions"
            value={data.mcVersion}
            onChange={(e) => set("mcVersion", e.target.value)}
          />
          <datalist id="mc-versions">
            {versions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <label className="switch" style={{ marginTop: 8, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={snapshots}
              onChange={(e) => setSnapshots(e.target.checked)}
            />
            <span className="track" />
            Inclure les snapshots
          </label>
        </div>
        <div className="field">
          <label>Type de launcher</label>
          <select
            value={data.launcherType}
            onChange={(e) =>
              set(
                "launcherType",
                e.target.value as LauncherFormData["launcherType"],
              )
            }
          >
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
          <select
            value={data.loader}
            onChange={(e) =>
              set("loader", e.target.value as LauncherFormData["loader"])
            }
          >
            <option value="vanilla">Aucun (vanilla)</option>
            <option value="fabric">Fabric</option>
            <option value="forge">Forge</option>
            <option value="quilt">Quilt</option>
            <option value="neoforge">NeoForge</option>
          </select>
          <div className="hint">
            Fabric et Quilt sont gérés automatiquement.
          </div>
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

      <div className="wizard-tip">
        <UiIcon name="check" size={18} />
        <div>
          <strong>Les réglages par défaut sont prêts</strong>
          <p>
            Tu peux continuer maintenant. L’adresse du serveur, la mémoire et
            les options JVM restent facultatives.
          </p>
        </div>
      </div>

      <details className="advanced-disclosure">
        <summary>Serveur, mémoire et options techniques</summary>
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
              onChange={(e) =>
                set(
                  "serverPort",
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
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
            <div className="hint">
              Recommandé : 4096 Mo pour un serveur moddé.
            </div>
          </div>
        </div>

        <button
          className="btn ghost sm"
          type="button"
          onClick={() => setAdvanced((a) => !a)}
        >
          {advanced ? "▾" : "▸"} Arguments avancés (JVM)
        </button>
        {advanced && (
          <div className="field" style={{ marginTop: 12 }}>
            <label>Arguments JVM (un par ligne)</label>
            <textarea
              value={data.jvmArgs.join("\n")}
              placeholder="-XX:+UseG1GC&#10;-XX:MaxGCPauseMillis=200"
              onChange={(e) =>
                set(
                  "jvmArgs",
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
            <div className="hint">Pour utilisateurs avancés uniquement.</div>
          </div>
        )}
      </details>
    </>
  );
}

/* =============================== Étape 4 =============================== */
function StepContent({ data, set }: StepProps) {
  const content = {
    mod: data.mods,
    resourcepack: data.resourcepacks,
    shaderpack: data.shaderpacks,
  };

  function updateContent(
    kind: "mod" | "resourcepack" | "shaderpack",
    items: DownloadableFile[],
  ) {
    if (kind === "mod") set("mods", items);
    if (kind === "resourcepack") set("resourcepacks", items);
    if (kind === "shaderpack") set("shaderpacks", items);
  }

  return (
    <>
      <div className="wizard-tip">
        <UiIcon name="shield" size={18} />
        <div>
          <strong>Choisis, nous configurons le fichier</strong>
          <p>
            Recherche un contenu compatible puis clique sur Ajouter. L’URL, la
            version, la taille et l’empreinte de sécurité sont récupérées et
            vérifiées côté serveur.
          </p>
        </div>
      </div>

      <ContentCatalogEditor
        minecraftVersion={data.mcVersion}
        loader={data.loader}
        items={content}
        onChange={updateContent}
      />

      <details className="advanced-disclosure">
        <summary>Importer un fichier manuellement (avancé)</summary>
        <p className="hint">
          Réservé aux fichiers absents des catalogues. Tu dois connaître l’URL
          directe, la taille exacte et le SHA-256 publié par la source.
        </p>
        <FileListEditor
          label="Mods manuels"
          items={data.mods.filter((file) => file.source === "direct")}
          onChange={(manual) =>
            set("mods", [
              ...data.mods.filter((file) => file.source !== "direct"),
              ...manual,
            ])
          }
        />
        <hr className="hr" />
        <FileListEditor
          label="Packs de ressources manuels"
          items={data.resourcepacks.filter((file) => file.source === "direct")}
          onChange={(manual) =>
            set("resourcepacks", [
              ...data.resourcepacks.filter((file) => file.source !== "direct"),
              ...manual,
            ])
          }
        />
        <hr className="hr" />
        <FileListEditor
          label="Shaders manuels"
          items={data.shaderpacks.filter((file) => file.source === "direct")}
          onChange={(manual) =>
            set("shaderpacks", [
              ...data.shaderpacks.filter((file) => file.source !== "direct"),
              ...manual,
            ])
          }
        />
      </details>
    </>
  );
}

/* =============================== Étape 5 =============================== */
function StepNews({ data, set }: StepProps) {
  return (
    <>
      <label className="switch switch-card">
        <input
          type="checkbox"
          checked={data.showNews}
          onChange={(event) => set("showNews", event.target.checked)}
        />
        <span className="track" />
        <span>
          <strong>Afficher les actualités dans le launcher</strong>
          <small>
            Tu peux désactiver ce bloc si ton serveur n’en a pas encore besoin.
          </small>
        </span>
      </label>
      {data.showNews && (
        <NewsEditor
          items={data.news}
          onChange={(value) => set("news", value)}
        />
      )}
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
  return (
    <>
      <div className="integration-grid">
        <div className={`integration-card ${data.showDiscord ? "active" : ""}`}>
          <label className="switch">
            <input
              type="checkbox"
              checked={data.showDiscord}
              onChange={(event) => set("showDiscord", event.target.checked)}
            />
            <span className="track" />
            <span>
              <strong>Discord</strong>
              <small>Affiche un accès direct à ta communauté.</small>
            </span>
          </label>
          {data.showDiscord && (
            <input
              type="url"
              placeholder="https://discord.gg/ton-serveur"
              value={data.discordUrl ?? ""}
              onChange={(event) => set("discordUrl", event.target.value)}
            />
          )}
        </div>

        <div className={`integration-card ${data.showWebsite ? "active" : ""}`}>
          <label className="switch">
            <input
              type="checkbox"
              checked={data.showWebsite}
              onChange={(event) => set("showWebsite", event.target.checked)}
            />
            <span className="track" />
            <span>
              <strong>Site web</strong>
              <small>Redirige vers ta boutique, ton wiki ou ton site.</small>
            </span>
          </label>
          {data.showWebsite && (
            <input
              type="url"
              placeholder="https://ton-site.fr"
              value={data.websiteUrl ?? ""}
              onChange={(event) => set("websiteUrl", event.target.value)}
            />
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="support-url">
          Lien de support <span className="field-optional">facultatif</span>
        </label>
        <input
          id="support-url"
          type="url"
          placeholder="https://discord.gg/… ou https://support.ton-site.fr"
          value={data.supportUrl ?? ""}
          onChange={(event) => set("supportUrl", event.target.value || null)}
        />
        <div className="hint">
          Utilisé par le bouton « J’ai un problème » dans l’application.
        </div>
      </div>

      <div className="field">
        <label>Ambiance animée</label>
        <div className="choice-grid ambiance-grid">
          {AMBIANCES.map((ambiance) => (
            <button
              type="button"
              key={ambiance.id}
              className={`choice ${data.ambiance === ambiance.id ? "active" : ""}`}
              onClick={() => set("ambiance", ambiance.id)}
            >
              <span className="name">{ambiance.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function StepOperations({ data, set }: StepProps) {
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
      {/* Bannière d'alerte */}
      <div className="card tight" style={{ marginBottom: 14 }}>
        <label className="switch">
          <input
            type="checkbox"
            checked={data.alert.active}
            onChange={(e) =>
              set("alert", { ...data.alert, active: e.target.checked })
            }
          />
          <span className="track" />
          Bannière d&apos;alerte prioritaire
        </label>
        {data.alert.active && (
          <div className="grid cols-2" style={{ gap: 10, marginTop: 10 }}>
            <select
              value={data.alert.kind}
              onChange={(e) =>
                set("alert", {
                  ...data.alert,
                  kind: e.target.value as typeof data.alert.kind,
                })
              }
            >
              <option value="info">Info</option>
              <option value="warn">Avertissement</option>
              <option value="update">Mise à jour</option>
            </select>
            <input
              placeholder="Ex : Maintenance ce soir à 21h"
              value={data.alert.message}
              onChange={(e) =>
                set("alert", { ...data.alert, message: e.target.value })
              }
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
            onChange={(e) =>
              set("maintenance", {
                ...data.maintenance,
                active: e.target.checked,
              })
            }
          />
          <span className="track" />
          Mode maintenance (désactive le bouton Jouer)
        </label>
        {data.maintenance.active && (
          <div className="grid cols-2" style={{ gap: 10, marginTop: 10 }}>
            <input
              placeholder="Raison (optionnel)"
              value={data.maintenance.reason ?? ""}
              onChange={(e) =>
                set("maintenance", {
                  ...data.maintenance,
                  reason: e.target.value || undefined,
                })
              }
            />
            <input
              placeholder="Retour prévu (ex : 18h30)"
              value={data.maintenance.until ?? ""}
              onChange={(e) =>
                set("maintenance", {
                  ...data.maintenance,
                  until: e.target.value || undefined,
                })
              }
            />
          </div>
        )}
      </div>

      <hr className="hr" />

      {/* Événements */}
      <div className="row spread" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          Événements <span className="pill">{events.length}</span>
        </label>
        <button
          className="btn secondary sm"
          type="button"
          onClick={() => set("events", [...events, emptyEvent()])}
        >
          + Ajouter un événement
        </button>
      </div>
      {events.map((ev, i) => (
        <div className="card tight" key={ev.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="grid cols-2" style={{ gap: 10 }}>
                <input
                  placeholder="Titre (Event Donjon)"
                  value={ev.title}
                  onChange={(e) => updEvent(i, { title: e.target.value })}
                />
                <input
                  type="datetime-local"
                  value={ev.startsAt}
                  onChange={(e) => updEvent(i, { startsAt: e.target.value })}
                />
              </div>
              <textarea
                placeholder="Description"
                value={ev.description}
                onChange={(e) => updEvent(i, { description: e.target.value })}
                style={{ marginTop: 8, minHeight: 50 }}
              />
              <div className="grid cols-2" style={{ gap: 10, marginTop: 8 }}>
                <input
                  placeholder="Récompenses (optionnel)"
                  value={ev.rewards ?? ""}
                  onChange={(e) =>
                    updEvent(i, { rewards: e.target.value || undefined })
                  }
                />
                <input
                  placeholder="URL image (optionnel)"
                  value={ev.imageUrl ?? ""}
                  onChange={(e) =>
                    updEvent(i, { imageUrl: e.target.value || undefined })
                  }
                />
              </div>
              <div className="grid cols-2" style={{ gap: 10, marginTop: 8 }}>
                <input
                  placeholder="Texte du bouton"
                  value={ev.buttonLabel ?? ""}
                  onChange={(e) =>
                    updEvent(i, { buttonLabel: e.target.value || undefined })
                  }
                />
                <input
                  placeholder="Lien du bouton"
                  value={ev.buttonUrl ?? ""}
                  onChange={(e) =>
                    updEvent(i, { buttonUrl: e.target.value || undefined })
                  }
                />
              </div>
            </div>
            <button
              className="icon-btn"
              type="button"
              onClick={() =>
                set(
                  "events",
                  events.filter((_, idx) => idx !== i),
                )
              }
            >
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
        <button
          className="btn secondary sm"
          type="button"
          onClick={() => set("patchNotes", [...patch, emptyPatchNote()])}
        >
          + Ajouter une note
        </button>
      </div>
      {patch.map((pn, i) => (
        <div className="card tight" key={pn.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="grid cols-2" style={{ gap: 10 }}>
                <input
                  placeholder="Version (1.2.0)"
                  value={pn.version}
                  onChange={(e) => updPatch(i, { version: e.target.value })}
                />
                <input
                  type="date"
                  value={pn.date}
                  onChange={(e) => updPatch(i, { date: e.target.value })}
                />
              </div>
              <textarea
                placeholder="Une modification par ligne&#10;+ Nouveau donjon&#10;- Correction de bugs"
                value={pn.lines.join("\n")}
                onChange={(e) =>
                  updPatch(i, {
                    lines: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                style={{ marginTop: 8, minHeight: 70 }}
              />
            </div>
            <button
              className="icon-btn"
              type="button"
              onClick={() =>
                set(
                  "patchNotes",
                  patch.filter((_, idx) => idx !== i),
                )
              }
            >
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
      <div className="review-hero">
        <div className="row spread">
          <div>
            <span>Prêt à être partagé</span>
            <h3>{data.title || "Sans nom"}</h3>
            <code>{data.slug}</code>
          </div>
          <span className={`badge ${data.status}`}>
            <span className="dot" />
            {data.status === "published"
              ? "Publié"
              : data.status === "ready"
                ? "Prêt"
                : "Brouillon"}
          </span>
        </div>
      </div>

      <div className="review-grid">
        <button type="button" onClick={onEdit}>
          <span>
            <UiIcon name="user" size={18} />
          </span>
          <div>
            <small>Identité</small>
            <strong>{data.title || "À compléter"}</strong>
          </div>
        </button>
        <div>
          <span>
            <UiIcon name="server" size={18} />
          </span>
          <div>
            <small>Minecraft</small>
            <strong>
              {data.mcVersion} · {data.loader}
            </strong>
          </div>
        </div>
        <div>
          <span>
            <UiIcon name="layers" size={18} />
          </span>
          <div>
            <small>Contenu automatique</small>
            <strong>
              {data.mods.length +
                data.resourcepacks.length +
                data.shaderpacks.length}{" "}
              fichier(s)
            </strong>
          </div>
        </div>
        <div>
          <span>
            <UiIcon name="activity" size={18} />
          </span>
          <div>
            <small>Communication</small>
            <strong>
              {data.news.length} actu · {data.events.length} événement(s)
            </strong>
          </div>
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
          <div
            style={{ fontWeight: 700, color: "var(--brand)", marginBottom: 8 }}
          >
            ✓ Launcher généré et publié !
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Tes joueurs ouvrent YourLauncher et entrent le code :
          </p>
          <div style={{ fontSize: 22, marginBottom: 12 }}>
            <code>{data.slug}</code>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <a
              className="btn"
              href={`/api/manifest/${data.slug}?download=1`}
              download
            >
              ⬇ Télécharger le manifest.json
            </a>
            <a
              className="btn secondary"
              href={manifestUrl}
              target="_blank"
              rel="noreferrer"
            >
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
