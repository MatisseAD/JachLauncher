"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

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

const CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-2402260558916344";

export default function AdSlot({
  slot,
  format = "leaderboard",
  label = true,
  dismissible = true,
}: {
  /** ID du bloc AdSense (data-ad-slot). */
  slot?: string;
  format?: AdFormat;
  label?: boolean;
  /** Autorise le créateur à masquer l'emplacement pendant sept jours. */
  dismissible?: boolean;
}) {
  const pushed = useRef(false);
  const { locale } = useI18n();
  const copy = AD_COPY[locale];
  const [hidden, setHidden] = useState(false);
  const enabled = Boolean(CLIENT && slot);

  useEffect(() => {
    const until = Number(localStorage.getItem("yourlauncher-ad-hidden-until"));
    if (Number.isFinite(until) && until > Date.now()) setHidden(true);
  }, []);

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

  if (hidden) return null;

  return (
    <div
      className={`ad-slot ${format}`}
      aria-label="Publicité"
      style={{ minHeight }}
    >
      <div className="ad-slot-head">
        <div>
          {label && <span className="ad-tag">{copy.partner}</span>}
          <strong>{copy.support}</strong>
        </div>
        {dismissible && (
          <button
            type="button"
            className="ad-dismiss"
            aria-label={copy.hideAria}
            onClick={() => {
              localStorage.setItem(
                "yourlauncher-ad-hidden-until",
                String(Date.now() + 7 * 24 * 60 * 60 * 1000),
              );
              setHidden(true);
            }}
          >
            {copy.hide}
          </button>
        )}
      </div>
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
        <span className="ad-placeholder">{copy.placeholder}</span>
      )}
    </div>
  );
}

const AD_COPY = {
  fr: {
    partner: "Partenaire",
    support: "Un soutien discret à la plateforme",
    hide: "Masquer 7 jours",
    hideAria: "Masquer cet emplacement pendant sept jours",
    placeholder:
      "Cet espace accueillera prochainement un partenaire sélectionné, sans pop-up ni interruption de ton travail.",
  },
  en: {
    partner: "Partner",
    support: "Discreet support for the platform",
    hide: "Hide for 7 days",
    hideAria: "Hide this placement for seven days",
    placeholder:
      "A selected partner will appear here soon, without pop-ups or interruptions.",
  },
  es: {
    partner: "Socio",
    support: "Un apoyo discreto a la plataforma",
    hide: "Ocultar 7 días",
    hideAria: "Ocultar durante siete días",
    placeholder:
      "Pronto aparecerá aquí un socio seleccionado, sin pop-ups ni interrupciones.",
  },
  de: {
    partner: "Partner",
    support: "Dezente Unterstützung der Plattform",
    hide: "7 Tage ausblenden",
    hideAria: "Diesen Platz sieben Tage ausblenden",
    placeholder:
      "Hier erscheint bald ein ausgewählter Partner – ohne Pop-ups oder Unterbrechung.",
  },
  pt: {
    partner: "Parceiro",
    support: "Apoio discreto à plataforma",
    hide: "Ocultar 7 dias",
    hideAria: "Ocultar este espaço por sete dias",
    placeholder:
      "Um parceiro selecionado aparecerá aqui em breve, sem pop-ups ou interrupções.",
  },
  it: {
    partner: "Partner",
    support: "Supporto discreto alla piattaforma",
    hide: "Nascondi 7 giorni",
    hideAria: "Nascondi per sette giorni",
    placeholder:
      "Un partner selezionato apparirà presto qui, senza pop-up o interruzioni.",
  },
} as const;
