import Link from "next/link";
import Footer from "@/components/Footer";
import HeroMockup from "@/components/HeroMockup";
import Navbar from "@/components/Navbar";
import UiIcon, { type UiIconName } from "@/components/UiIcon";
import { getDict, getLocale } from "@/i18n/server";
import { getMarketingCopy } from "@/i18n/marketing-content";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const showcase = [
  {
    name: "Nova Survival",
    code: "nova-survival",
    type: 0,
    version: "1.21.8 · Fabric",
    players: 128,
    colors: ["#8b5cf6", "#3b1b6f"],
  },
  {
    name: "Elyria Origins",
    code: "elyria-origins",
    type: 1,
    version: "1.20.1 · Forge",
    players: 64,
    colors: ["#059669", "#083b34"],
  },
  {
    name: "Block District",
    code: "block-district",
    type: 2,
    version: "1.21.5 · Vanilla",
    players: null,
    colors: ["#2563eb", "#172554"],
  },
];

const featureIcons: UiIconName[] = ["sparkles", "layers", "activity", "shield"];

async function getPublicStats() {
  if (!process.env.DATABASE_URL) {
    return { users: 0, launchers: 0, published: 0 };
  }
  try {
    const [users, launchers, published] = await prisma.$transaction([
      prisma.user.count(),
      prisma.launcher.count(),
      prisma.launcher.count({ where: { status: "published" } }),
    ]);
    return { users, launchers, published };
  } catch {
    return { users: 0, launchers: 0, published: 0 };
  }
}

export default async function Home() {
  const [session, t, stats, locale] = await Promise.all([
    getSession(),
    getDict(),
    getPublicStats(),
    getLocale(),
  ]);
  const copy = getMarketingCopy(locale);
  const createHref = session ? "/dashboard/new" : "/register";

  return (
    <>
      <Navbar />

      <main>
        <section className="marketing-hero">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="marketing-hero-grid">
            <div className="marketing-hero-copy">
              <span className="announcement-pill">
                <i />
                {copy.announcement}
              </span>
              <h1>
                {copy.headline} <span>{copy.headlineAccent}</span>
              </h1>
              <p>{t.hero.subtitle}</p>
              <div className="hero-actions">
                <Link href={createHref} className="btn lg">
                  {t.hero.ctaPrimary}
                  <UiIcon name="arrow" size={18} />
                </Link>
                <Link
                  href="/preview/serveur-demo"
                  className="btn secondary lg"
                  target="_blank"
                >
                  {t.hero.ctaSecondary}
                  <UiIcon name="external" size={17} />
                </Link>
              </div>
              <div className="hero-proof">
                <span>
                  <UiIcon name="check" size={15} /> {copy.noCard}
                </span>
                <span>
                  <UiIcon name="check" size={15} /> {copy.instantPreview}
                </span>
                <span>
                  <UiIcon name="check" size={15} /> {copy.upToThree}
                </span>
              </div>
            </div>
            <div className="hero-product">
              <div className="hero-product-label">
                <span>
                  <i /> {copy.interactiveDemo}
                </span>
                <small>{copy.desktopApp}</small>
              </div>
              <HeroMockup />
            </div>
          </div>
        </section>

        <section
          className="trust-strip"
          aria-label="Statistiques de la plateforme"
        >
          <div>
            <strong>{stats.users}</strong>
            <span>
              {copy.creators} {copy.registered}
            </span>
          </div>
          <div>
            <strong>{stats.launchers}</strong>
            <span>
              {copy.launchers} {copy.configured}
            </span>
          </div>
          <div>
            <strong>{stats.published}</strong>
            <span>
              {copy.servers} {copy.published}
            </span>
          </div>
          <div>
            <strong>5</strong>
            <span>{copy.supportedLoaders}</span>
          </div>
        </section>

        <section className="marketing-section" id="examples">
          <div className="section-intro split">
            <div>
              <span className="page-kicker">{copy.inspirations}</span>
              <h2>{copy.examplesTitle}</h2>
            </div>
            <p>{copy.examplesIntro}</p>
          </div>
          <div className="showcase-grid">
            {showcase.map((item, index) => (
              <Link
                href={`/preview/${item.code}`}
                target="_blank"
                className="showcase-card"
                key={item.code}
                aria-label={`Ouvrir la démonstration ${item.name}`}
              >
                <div
                  className="showcase-cover"
                  style={{
                    background: `radial-gradient(circle at 75% 25%, ${item.colors[0]}aa, transparent 35%), linear-gradient(135deg, ${item.colors[1]}, #0d0d13)`,
                  }}
                >
                  <span className="showcase-number">0{index + 1}</span>
                  <span className="showcase-state">
                    <i /> {copy.example}
                  </span>
                  <UiIcon name="rocket" size={42} />
                </div>
                <div className="showcase-body">
                  <div>
                    <span>{copy.showcaseTypes[item.type]}</span>
                    <h3>{item.name}</h3>
                  </div>
                  <code>{item.code}</code>
                  <div className="showcase-meta">
                    <span>{item.version}</span>
                    <span>
                      {item.players == null
                        ? copy.preparing
                        : `${item.players} ${copy.players}`}
                    </span>
                  </div>
                </div>
                <span className="showcase-open">
                  {copy.tryExample} <UiIcon name="external" size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="marketing-section" id="features">
          <div className="section-intro centered">
            <span className="page-kicker">Tout est inclus</span>
            <h2>{t.features.title}</h2>
            <p>{t.features.subtitle}</p>
          </div>
          <div className="feature-bento">
            {t.features.items.map((feature, index) => (
              <article
                className={`feature-card feature-card-${index + 1}`}
                key={feature.title}
              >
                <span className="feature-icon">
                  <UiIcon name={featureIcons[index] ?? "sparkles"} size={23} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                {index === 0 && (
                  <div className="palette-demo" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                )}
                {index === 1 && (
                  <div className="stack-demo" aria-hidden="true">
                    <span>Fabric</span>
                    <span>Forge</span>
                    <span>NeoForge</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="workflow-section">
          <div className="workflow-copy">
            <span className="page-kicker">{t.how.eyebrow}</span>
            <h2>{t.how.title}</h2>
            <p>{copy.workflowIntro}</p>
            <Link href={createHref} className="text-link">
              {copy.createSpace} <UiIcon name="arrow" size={16} />
            </Link>
          </div>
          <div className="workflow-steps">
            {t.how.steps.map((step, index) => (
              <article key={step.title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-section">
          <div className="cta-panel">
            <div className="cta-glow" />
            <span className="cta-icon">
              <UiIcon name="rocket" size={27} />
            </span>
            <h2>{t.ctaBottom.title}</h2>
            <p>{t.ctaBottom.subtitle}</p>
            <Link href={createHref} className="btn lg">
              {t.ctaBottom.button}
              <UiIcon name="arrow" size={18} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
