"use client";

import { useEffect, useRef } from "react";

/**
 * Emplacement publicitaire réutilisable.
 *
 * - Sans configuration : affiche un placeholder discret (« Espace publicitaire »).
 * - Avec `NEXT_PUBLIC_ADSENSE_CLIENT` défini (+ un slot id) : affiche une vraie
 *   publicité Google AdSense. Le script est chargé dans le layout.
 *
 * On reste sobre : peu d'emplacements, jamais au-dessus du contenu principal.
 */
type AdFormat = "leaderboard" | "rectangle";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function AdSlot({
  slot,
  format = "leaderboard",
  label = true,
}: {
  /** ID du bloc AdSense (data-ad-slot). */
  slot?: string;
  format?: AdFormat;
  label?: boolean;
}) {
  const pushed = useRef(false);
  const enabled = Boolean(CLIENT && slot);

  useEffect(() => {
    if (!enabled || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense pas prêt — ignoré */
    }
  }, [enabled]);

  const minHeight = format === "rectangle" ? 250 : 110;

  return (
    <div className={`ad-slot ${format}`} aria-label="Publicité" style={{ minHeight }}>
      {label && <span className="ad-tag">Publicité</span>}
      {enabled ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-client={CLIENT}
          data-ad-slot={slot}
          data-ad-format={format === "rectangle" ? "rectangle" : "auto"}
          data-full-width-responsive="true"
        />
      ) : (
        <span className="ad-placeholder">
          Espace publicitaire {format === "rectangle" ? "300×250" : "responsive"}
        </span>
      )}
    </div>
  );
}
