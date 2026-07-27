import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import LogoutButton from "./LogoutButton";
import LanguageSwitcher from "./LanguageSwitcher";
import LogoMark from "./LogoMark";

export default async function Navbar() {
  const session = await getSession();
  const t = await getDict();
  return (
    <nav className="navbar">
      <Link href="/" className="brand">
        <LogoMark />
      </Link>
      <div className="row" style={{ gap: 14 }}>
        <Link href="/#features" className="navlink">
          {t.nav.features}
        </Link>
        <Link href="/help" className="navlink">
          {t.nav.help}
        </Link>
        <LanguageSwitcher />
        {session ? (
          <>
            <Link href="/dashboard" className="navlink">
              {t.nav.dashboard}
            </Link>
            <Link href="/account" className="navlink">
              {session.username}
            </Link>
            <LogoutButton label={t.nav.logout} />
          </>
        ) : (
          <>
            <Link href="/login" className="navlink">
              {t.nav.login}
            </Link>
            <Link href="/register" className="btn sm">
              {t.nav.register}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
