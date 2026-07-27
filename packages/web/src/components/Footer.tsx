import Link from "next/link";
import { getDict } from "@/i18n/server";
import LanguageSwitcher from "./LanguageSwitcher";
import LogoMark from "./LogoMark";

export default async function Footer() {
  const t = await getDict();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <LogoMark />
          </Link>
          <p className="muted" style={{ maxWidth: 280, marginTop: 12 }}>
            {t.footer.tagline}
          </p>
          <span className="badge published" style={{ marginTop: 8 }}>
            <span className="dot" />
            {t.footer.freeNote}
          </span>
        </div>

        <div className="footer-col">
          <h4>{t.footer.colProduct}</h4>
          <Link href="/#features">{t.footer.linkFeatures}</Link>
          <Link href="/preview/serveur-demo">{t.footer.linkExample}</Link>
          <Link href="/register">{t.footer.linkCreate}</Link>
        </div>

        <div className="footer-col">
          <h4>{t.footer.colResources}</h4>
          <Link href="/help">{t.footer.linkHelp}</Link>
          <a
            href="https://github.com/MatisseAD/TutoLauncher"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>

        <div className="footer-col">
          <h4>{t.footer.colLanguage}</h4>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="footer-bottom">
        <span className="muted">{t.footer.rights}</span>
        <span className="muted">© {new Date().getFullYear()} YourLauncher</span>
      </div>
    </footer>
  );
}
