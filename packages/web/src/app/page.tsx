import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroMockup from "@/components/HeroMockup";
import Particles from "@/components/Particles";
import AdSlot from "@/components/AdSlot";
import IntroVideo from "@/components/IntroVideo";
import { getSession } from "@/lib/auth";
import { getDict } from "@/i18n/server";

export default async function Home() {
  const session = await getSession();
  const t = await getDict();
  const createHref = session ? "/dashboard/new" : "/register";

  return (
    <>
      <IntroVideo />
      <Navbar />

      {/* HERO */}
      <section className="hero">
        <Particles />
        <div className="hero-grid" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <img
              src="/logo.png"
              alt="YourLauncher"
              width={132}
              height={132}
              style={{
                display: "block",
                marginBottom: 18,
                filter: "drop-shadow(0 8px 30px rgba(139,92,246,0.45))",
              }}
            />
            <span className="eyebrow">⛏ {t.hero.badge}</span>
            <h1>
              {t.hero.titleLine1}{" "}
              <span className="grad">{t.hero.titleHighlight}</span>{" "}
              {t.hero.titleLine2}
            </h1>
            <p className="lead">{t.hero.subtitle}</p>
            <div className="row wrap">
              <Link href={createHref} className="btn lg">
                {t.hero.ctaPrimary}
              </Link>
              <Link
                href="/preview/serveur-demo"
                className="btn secondary lg"
                target="_blank"
              >
                {t.hero.ctaSecondary}
              </Link>
            </div>
            <div
              className="row wrap"
              style={{
                gap: 22,
                marginTop: 26,
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              <span>✓ {t.hero.perk1}</span>
              <span>✓ {t.hero.perk2}</span>
              <span>✓ {t.hero.perk3}</span>
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* BANNIÈRE GRATUIT */}
      <section className="container">
        <div className="free-banner">
          <div>
            <span className="eyebrow" style={{ marginBottom: 12 }}>
              💚 {t.free.eyebrow}
            </span>
            <h2 style={{ margin: "0 0 8px", fontSize: 30 }}>{t.free.title}</h2>
            <p className="muted" style={{ maxWidth: 560, margin: 0 }}>
              {t.free.subtitle}
            </p>
          </div>
          <div className="free-points">
            <div className="free-point">✅ {t.free.b1}</div>
            <div className="free-point">✅ {t.free.b2}</div>
            <div className="free-point">✅ {t.free.b3}</div>
          </div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="container" id="features">
        <div className="section-head">
          <h2>{t.features.title}</h2>
          <p className="muted">{t.features.subtitle}</p>
        </div>
        <div className="grid cols-auto">
          {t.features.items.map((f, i) => (
            <div className="card feature hover" key={i}>
              <div className="ic">{f.icon}</div>
              <h3>{f.title}</h3>
              <p className="muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pub — discrète, entre deux sections */}
      <section
        className="container"
        style={{ paddingTop: 0, paddingBottom: 0 }}
      >
        <AdSlot format="leaderboard" />
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="container">
        <div className="section-head">
          <span className="eyebrow">{t.how.eyebrow}</span>
          <h2>{t.how.title}</h2>
        </div>
        <div className="grid cols-3">
          {t.how.steps.map((s, i) => (
            <div className="card" key={i}>
              <div className="step-num">{i + 1}</div>
              <h3 style={{ margin: "10px 0 6px" }}>{s.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container">
        <div className="card cta-final">
          <h2 style={{ marginTop: 0 }}>{t.ctaBottom.title}</h2>
          <p className="muted" style={{ maxWidth: 560, margin: "0 auto 22px" }}>
            {t.ctaBottom.subtitle}
          </p>
          <Link href={createHref} className="btn lg">
            {t.ctaBottom.button}
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
