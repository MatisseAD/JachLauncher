import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import UiIcon from "@/components/UiIcon";
import { getDict } from "@/i18n/server";

export default async function HelpPage() {
  const t = await getDict();
  const downloadUrl = process.env.NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL;

  return (
    <>
      <Navbar />
      <main className="help-page">
        <section className="help-hero">
          <span className="page-kicker">Centre d’aide</span>
          <h1>{t.help.title}</h1>
          <p>{t.help.subtitle}</p>
          <div className="help-hero-actions">
            <a href="#creation" className="btn">
              Créer un launcher <UiIcon name="arrow" size={17} />
            </a>
            <a href="#installation" className="btn secondary">
              Installer l’application
            </a>
          </div>
        </section>

        <section className="help-layout" id="creation">
          <aside className="help-toc">
            <span>Dans ce guide</span>
            <a href="#creation">Créer et publier</a>
            <a href="#installation">Installer l’application</a>
            <a href="#faq">Questions fréquentes</a>
          </aside>

          <div className="help-content">
            <section>
              <div className="section-title-row">
                <div>
                  <span className="page-kicker">Guide créateur</span>
                  <h2>Créer et publier un launcher</h2>
                </div>
                <span>{t.help.steps.length} étapes</span>
              </div>
              <div className="guide-steps">
                {t.help.steps.map((step, index) => (
                  <article key={step.title}>
                    <span className="guide-number">0{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="installation-guide" id="installation">
              <div>
                <span className="page-kicker">Côté joueur</span>
                <h2>Installer et utiliser YourLauncher</h2>
                <p>
                  L’application est commune à tous les serveurs. Une fois
                  installée, le joueur saisit simplement le code communiqué par
                  le créateur.
                </p>
                <ul>
                  <li>
                    <UiIcon name="check" size={16} /> Installe l’application
                    Windows.
                  </li>
                  <li>
                    <UiIcon name="check" size={16} /> Connecte ton compte
                    Microsoft ou choisis le mode hors-ligne.
                  </li>
                  <li>
                    <UiIcon name="check" size={16} /> Saisis le code du launcher
                    publié.
                  </li>
                  <li>
                    <UiIcon name="check" size={16} /> Clique sur Jouer :
                    versions, Java et contenus sont préparés automatiquement.
                  </li>
                </ul>
                {downloadUrl ? (
                  <a className="btn" href={downloadUrl}>
                    <UiIcon name="download" size={17} />
                    Télécharger pour Windows
                  </a>
                ) : (
                  <span className="btn is-disabled">
                    Version Windows bientôt disponible
                  </span>
                )}
              </div>
              <div className="installation-visual">
                <span>
                  <UiIcon name="windows" size={34} />
                </span>
                <div>
                  <small>CODE DU LAUNCHER</small>
                  <strong>NOVA-SURVIVAL</strong>
                  <button>Continuer</button>
                </div>
              </div>
            </section>

            <section id="faq">
              <div className="section-title-row">
                <div>
                  <span className="page-kicker">Réponses rapides</span>
                  <h2>{t.help.faqTitle}</h2>
                </div>
              </div>
              <div className="faq-grid">
                {t.help.faq.map((item) => (
                  <details key={item.q}>
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </section>

            <section className="help-cta">
              <span className="help-cta-icon">
                <UiIcon name="rocket" size={24} />
              </span>
              <div>
                <h2>{t.help.ctaTitle}</h2>
                <p>Ton espace de création t’accompagne à chaque étape.</p>
              </div>
              <Link href="/dashboard/new" className="btn">
                {t.help.ctaBtn} <UiIcon name="arrow" size={16} />
              </Link>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
