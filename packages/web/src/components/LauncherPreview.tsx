"use client";

import { useEffect, useRef, useState } from "react";
import {
  LauncherSkin,
  type PlayState,
  type SkinProgress,
  type TabId,
  type SkinState,
} from "@jach/ui";
import "@jach/ui/skin.css";
import type { LauncherFormData } from "@/lib/launcher-types";
import { formToSkinConfig } from "@/lib/skin";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Aperçu du launcher côté site. Utilise EXACTEMENT le même composant
 * (`LauncherSkin`) que le vrai launcher Electron — le design est donc
 * garanti identique. Ici en mode "preview" : interactions visuelles seulement.
 */
export default function LauncherPreview({
  data,
  fullscreen,
}: {
  data: LauncherFormData;
  fullscreen?: boolean;
}) {
  const [tab, setTab] = useState<TabId>("home");
  const { locale } = useI18n();
  const labels = PREVIEW_LABELS[locale];
  const [inspectBackground, setInspectBackground] = useState(false);
  const [scale, setScale] = useState(1);
  const [playState, setPlayState] = useState<PlayState>("ready");
  const [progress, setProgress] = useState<SkinProgress>();
  const frameRef = useRef<HTMLDivElement>(null);
  const simulationTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const config = formToSkinConfig(data);

  const state: SkinState = {
    activeTab: tab,
    playState,
    progress,
    account: { username: "Steve", type: "offline" },
    server: { online: true, players: 42, maxPlayers: 100 },
    windowControls: true,
    selectedProfileId: "default",
  };

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      setScale(Math.min(rect.width / 1100, rect.height / 720));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      simulationTimers.current.forEach(clearTimeout);
    },
    [],
  );

  function simulateLaunch() {
    if (playState !== "ready" && playState !== "error") return;
    simulationTimers.current.forEach(clearTimeout);
    simulationTimers.current = [];

    const later = (
      delay: number,
      nextState: PlayState,
      nextProgress?: SkinProgress,
    ) => {
      simulationTimers.current.push(
        setTimeout(() => {
          setPlayState(nextState);
          setProgress(nextProgress);
        }, delay),
      );
    };

    setPlayState("verifying");
    setProgress({ percent: null, label: labels.verifying });
    later(650, "downloading", {
      percent: 22,
      label: labels.downloading,
      file: "minecraft-client.jar",
      speed: "18.4 Mo/s",
      eta: "3 s",
    });
    later(1_150, "downloading", {
      percent: 58,
      label: labels.downloading,
      file: "resources.zip",
      speed: "24.1 Mo/s",
      eta: "2 s",
    });
    later(1_650, "downloading", {
      percent: 91,
      label: labels.downloading,
      file: "mods/",
      speed: "21.7 Mo/s",
      eta: "1 s",
    });
    later(2_150, "extracting", {
      percent: 100,
      label: labels.installing,
    });
    later(2_750, "launching", {
      percent: null,
      label: labels.launching,
    });
    later(3_450, "running");
  }

  return (
    <div
      className={`launcher-preview-frame ${fullscreen ? "is-fullscreen" : ""} ${
        inspectBackground ? "is-background-inspection" : ""
      }`}
      ref={frameRef}
    >
      <div
        className="launcher-preview-canvas"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <LauncherSkin
          config={config}
          state={state}
          preview
          handlers={{
            onTab: setTab,
            onPlay: simulateLaunch,
            onOpenLink: (url) => window.open(url, "_blank", "noopener"),
          }}
        />
      </div>
      <div
        className="preview-inspection-tools"
        role="group"
        aria-label="Mode d’aperçu"
      >
        <button
          type="button"
          className={!inspectBackground ? "active" : ""}
          onClick={() => setInspectBackground(false)}
        >
          {labels.interface}
        </button>
        <button
          type="button"
          className={inspectBackground ? "active" : ""}
          onClick={() => setInspectBackground(true)}
        >
          {labels.background}
        </button>
      </div>
    </div>
  );
}

const PREVIEW_LABELS = {
  fr: {
    interface: "Interface",
    background: "Examiner le fond",
    verifying: "Vérification des fichiers…",
    downloading: "Téléchargement de la démonstration…",
    installing: "Installation des contenus…",
    launching: "Lancement de Minecraft…",
  },
  en: {
    interface: "Interface",
    background: "Inspect background",
    verifying: "Checking files…",
    downloading: "Downloading the demo…",
    installing: "Installing content…",
    launching: "Starting Minecraft…",
  },
  es: {
    interface: "Interfaz",
    background: "Examinar fondo",
    verifying: "Comprobando archivos…",
    downloading: "Descargando la demostración…",
    installing: "Instalando contenidos…",
    launching: "Iniciando Minecraft…",
  },
  de: {
    interface: "Oberfläche",
    background: "Hintergrund prüfen",
    verifying: "Dateien werden geprüft…",
    downloading: "Demo wird heruntergeladen…",
    installing: "Inhalte werden installiert…",
    launching: "Minecraft wird gestartet…",
  },
  pt: {
    interface: "Interface",
    background: "Examinar fundo",
    verifying: "Verificando arquivos…",
    downloading: "Baixando a demonstração…",
    installing: "Instalando conteúdos…",
    launching: "Iniciando o Minecraft…",
  },
  it: {
    interface: "Interfaccia",
    background: "Esamina sfondo",
    verifying: "Verifica dei file…",
    downloading: "Download della demo…",
    installing: "Installazione dei contenuti…",
    launching: "Avvio di Minecraft…",
  },
} as const;
