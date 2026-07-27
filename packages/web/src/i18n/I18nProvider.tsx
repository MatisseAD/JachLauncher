"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  t: Dict;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Fournit langue + dictionnaire aux composants client. Alimenté par le layout
 * serveur (qui lit le cookie), donc le rendu serveur et client coïncident.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  return ctx;
}

/** Raccourci : retourne le dictionnaire courant. */
export function useDict(): Dict {
  return useI18n().t;
}
