import Link from "next/link";
import { getDict, getLocale } from "@/i18n/server";
import { getMarketingCopy } from "@/i18n/marketing-content";
import LanguageSwitcher from "./LanguageSwitcher";
import LogoMark from "./LogoMark";
import UiIcon from "./UiIcon";

export default async function Footer() {
  const [t, locale] = await Promise.all([getDict(), getLocale()]);
  const copy = getMarketingCopy(locale);

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <LogoMark />
          </Link>
          <p>{t.footer.tagline}</p>
          <span className="footer-status">
            <i /> {copy.operational}
          </span>
        </div>

        <div className="footer-col">
          <h4>{t.footer.colProduct}</h4>
          <Link href="/#features">{t.footer.linkFeatures}</Link>
          <Link href="/#examples">{copy.examples}</Link>
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
            GitHub <UiIcon name="external" size={13} />
          </a>
        </div>

        <div className="footer-col">
          <h4>{t.footer.colLanguage}</h4>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="footer-bottom">
        <span>{t.footer.rights}</span>
        <span>© {new Date().getFullYear()} YourLauncher</span>
      </div>
    </footer>
  );
}
