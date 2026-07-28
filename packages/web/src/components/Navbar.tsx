import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDict, getLocale } from "@/i18n/server";
import { getMarketingCopy } from "@/i18n/marketing-content";
import LanguageSwitcher from "./LanguageSwitcher";
import LogoMark from "./LogoMark";
import UiIcon from "./UiIcon";

export default async function Navbar() {
  const [session, t, locale] = await Promise.all([
    getSession(),
    getDict(),
    getLocale(),
  ]);
  const copy = getMarketingCopy(locale);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand" aria-label="Accueil YourLauncher">
          <LogoMark />
        </Link>

        <nav className="public-nav" aria-label="Navigation principale">
          <Link href="/#features" className="navlink">
            {t.nav.features}
          </Link>
          <Link href="/#examples" className="navlink">
            {copy.examples}
          </Link>
          <Link href="/help" className="navlink">
            {t.nav.help}
          </Link>
        </nav>

        <div className="navbar-actions">
          <LanguageSwitcher />
          {session ? (
            <Link href="/dashboard" className="btn sm">
              <UiIcon name="dashboard" size={16} />
              {t.nav.dashboard}
            </Link>
          ) : (
            <>
              <Link href="/login" className="navlink login-link">
                {t.nav.login}
              </Link>
              <Link href="/register" className="btn sm">
                {t.nav.register}
                <UiIcon name="arrow" size={15} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
