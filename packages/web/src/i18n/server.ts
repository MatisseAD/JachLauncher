import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary, type Dict } from "./dictionaries";

/** Lit la langue depuis le cookie (serveur), avec repli sur la langue par défaut. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const c = store.get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

/** Dictionnaire correspondant à la langue courante (serveur). */
export async function getDict(): Promise<Dict> {
  return getDictionary(await getLocale());
}
