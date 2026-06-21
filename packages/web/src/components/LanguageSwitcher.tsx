"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_COOKIE } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

/** Sélecteur de langue (style Aternos) : globe + menu déroulant. */
export default function LanguageSwitcher() {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(code: string) {
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="lang" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} aria-label="Langue">
        <span style={{ fontSize: 15 }}>🌐</span>
        <span className="lang-code">{current.code.toUpperCase()}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div className="lang-menu">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              className={`lang-item ${l.code === locale ? "active" : ""}`}
              onClick={() => choose(l.code)}
            >
              <span>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
