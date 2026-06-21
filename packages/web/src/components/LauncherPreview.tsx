"use client";

import { useState } from "react";
import { LauncherSkin, type TabId, type SkinState } from "@jach/ui";
import "@jach/ui/skin.css";
import type { LauncherFormData } from "@/lib/launcher-types";
import { formToSkinConfig } from "@/lib/skin";

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
  const config = formToSkinConfig(data);

  const state: SkinState = {
    activeTab: tab,
    playState: "ready",
    account: { username: "Steve", type: "offline" },
    server: { online: true, players: 42, maxPlayers: 100 },
    windowControls: true,
    selectedProfileId: "default",
  };

  const wrapStyle: React.CSSProperties = fullscreen
    ? { width: "100%", height: "min(78vh, 760px)", borderRadius: 16, overflow: "hidden" }
    : { width: "100%", aspectRatio: "16 / 10", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow)" };

  return (
    <div style={wrapStyle}>
      <LauncherSkin
        config={config}
        state={state}
        preview
        handlers={{
          onTab: setTab,
          onOpenLink: (url) => window.open(url, "_blank", "noopener"),
        }}
      />
    </div>
  );
}
