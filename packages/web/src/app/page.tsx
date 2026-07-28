import Link from "next/link";
import Footer from "@/components/Footer";
import HeroMockup from "@/components/HeroMockup";
import Navbar from "@/components/Navbar";
import UiIcon, { type UiIconName } from "@/components/UiIcon";
import { getDict } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const showcase = [
  {
    name: "Nova Survival",
    code: "nova-survival",
    type: "Survie communautaire",
    version: "1.21.8 · Fabric",
    players: "128 joueurs",
    colors: ["#8b5cf6", "#3b1b6f"],
  },
  {
    name: "Elyria Origins",
    code: "elyria-origins",
    type: "Aventure modée",
    version: "1.20.1 · Forge",
    players: "64 joueurs",
    colors: ["#059669", "#083b34"],
  },
  {
    name: "Block District",
    code: "block-district",
    type: "Mini-jeux",
    version: "1.21.5 · Paper",
    players: "En préparation",
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
  const [session, t, stats] = await Promise.all([
    getSession(),
    getDict(),
    getPublicStats(),
  ]);
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
                Plateforme gratuite pour créateurs Minecraft
              </span>
              <h1>
                Le launcher de ton serveur.{" "}
                <span>Prêt à jouer, sans coder.</span>
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
                  <UiIcon name="check" size={15} /> Sans carte bancaire
                </span>
                <span>
                  <UiIcon name="check" size={15} /> Aperçu instantané
                </span>
                <span>
                  <UiIcon name="check" size={15} /> Jusqu’à 3 launchers
                </span>
              </div>
            </div>
            <div className="hero-product">
              <div className="hero-product-label">
                <span>
                  <i /> Démo interactive
                </span>
                <small>Application desktop</small>
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
              créateur{stats.users > 1 ? "s" : ""} inscrit
              {stats.users > 1 ? "s" : ""}
            </span>
          </div>
          <div>
            <strong>{stats.launchers}</strong>
            <span>
              launcher{stats.launchers > 1 ? "s" : ""} configuré
              {stats.launchers > 1 ? "s" : ""}
            </span>
          </div>
          <div>
            <strong>{stats.published}</strong>
            <span>
              serveur{stats.published > 1 ? "s" : ""} publié
              {stats.published > 1 ? "s" : ""}
            </span>
          </div>
          <div>
            <strong>5</strong>
            <span>mod loaders supportés</span>
          </div>
        </section>

        <section className="marketing-section" id="examples">
          <div className="section-intro split">
            <div>
              <span className="page-kicker">Inspirations</span>
              <h2>Un launcher à l’image de chaque serveur</h2>
            </div>
            <p>
              Pars d’une base professionnelle, puis adapte chaque détail à ton
              univers : couleurs, actualités, mods, événements et serveur.
            </p>
          </div>
          <div className="showcase-grid">
            {showcase.map((item, index) => (
              <article className="showcase-card" key={item.code}>
                <div
                  className="showcase-cover"
                  style={{
                    background: `radial-gradient(circle at 75% 25%, ${item.colors[0]}aa, transparent 35%), linear-gradient(135deg, ${item.colors[1]}, #0d0d13)`,
                  }}
                >
                  <span className="showcase-number">0{index + 1}</span>
                  <span className="showcase-state">
                    <i /> Exemple
                  </span>
                  <UiIcon name="rocket" size={42} />
                </div>
                <div className="showcase-body">
                  <div>
                    <span>{item.type}</span>
                    <h3>{item.name}</h3>
                  </div>
                  <code>{item.code}</code>
                  <div className="showcase-meta">
                    <span>{item.version}</span>
                    <span>{item.players}</span>
                  </div>
                </div>
              </article>
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
            <p>
              Une expérience guidée, pensée pour avancer sans connaissance
              technique et publier sans friction.
            </p>
            <Link href={createHref} className="text-link">
              Créer mon espace <UiIcon name="arrow" size={16} />
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
