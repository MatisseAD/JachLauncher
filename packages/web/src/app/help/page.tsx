import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import UiIcon from "@/components/UiIcon";
import { getLocale } from "@/i18n/server";
import { getGuideContent } from "@/i18n/guide-content";

export default async function HelpPage() {
  const locale = await getLocale();
  const guide = getGuideContent(locale);
  const downloadUrl = process.env.NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL;

  return (
    <>
      <Navbar />
      <main className="help-page">
        <section className="help-hero">
          <span className="page-kicker">{guide.heroKicker}</span>
          <h1>{guide.title}</h1>
          <p>{guide.subtitle}</p>
          <div className="help-hero-actions">
            <a href="#creation" className="btn">
              {guide.creatorAction} <UiIcon name="arrow" size={17} />
            </a>
            <a href="#installation" className="btn secondary">
              {guide.playerAction}
            </a>
          </div>
        </section>

        <section className="help-layout" id="creation">
          <aside className="help-toc">
            <span>{guide.tocTitle}</span>
            <a href="#creation">{guide.tocCreation}</a>
            <a href="#installation">{guide.tocInstall}</a>
            <a href="#troubleshooting">{guide.tocTroubleshoot}</a>
            <a href="#faq">{guide.tocFaq}</a>
          </aside>

          <div className="help-content">
            <section>
              <div className="section-title-row">
                <div>
                  <span className="page-kicker">{guide.creatorKicker}</span>
                  <h2>{guide.creatorTitle}</h2>
                </div>
                <span>{guide.stepCount}</span>
              </div>
              <div className="guide-steps">
                {guide.steps.map((step, index) => (
                  <article key={step.title}>
                    <span className="guide-number">0{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                      <small className="guide-tip">
                        <UiIcon name="sparkles" size={13} /> {step.tip}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="installation-guide" id="installation">
              <div>
                <span className="page-kicker">{guide.playerKicker}</span>
                <h2>{guide.playerTitle}</h2>
                <p>{guide.playerIntro}</p>
                <ul>
                  {guide.playerSteps.map((step) => (
                    <li key={step}>
                      <UiIcon name="check" size={16} /> {step}
                    </li>
                  ))}
                </ul>
                {downloadUrl ? (
                  <a className="btn" href={downloadUrl}>
                    <UiIcon name="download" size={17} />
                    {guide.download}
                  </a>
                ) : (
                  <span className="btn is-disabled">{guide.soon}</span>
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

            <section id="troubleshooting">
              <div className="section-title-row">
                <div>
                  <span className="page-kicker">
                    {guide.troubleshootingKicker}
                  </span>
                  <h2>{guide.troubleshootingTitle}</h2>
                </div>
              </div>
              <div className="troubleshooting-grid">
                {guide.troubleshooting.map((item, index) => (
                  <article key={item.title}>
                    <span className="metric-icon purple">
                      <UiIcon
                        name={
                          (["help", "shield", "activity", "sparkles"] as const)[
                            index
                          ]
                        }
                        size={18}
                      />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <strong>{item.action}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section id="faq">
              <div className="section-title-row">
                <div>
                  <span className="page-kicker">{guide.faqKicker}</span>
                  <h2>{guide.faqTitle}</h2>
                </div>
              </div>
              <div className="faq-grid">
                {guide.faq.map((item) => (
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
                <h2>{guide.ctaTitle}</h2>
                <p>{guide.ctaText}</p>
              </div>
              <Link href="/dashboard/new" className="btn">
                {guide.ctaButton} <UiIcon name="arrow" size={16} />
              </Link>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
