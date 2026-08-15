import Link from "next/link";
import type { Metadata } from "next";
import AdSlot from "@/components/AdSlot";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import UiIcon from "@/components/UiIcon";
import { getLocale } from "@/i18n/server";
import { getWhyCopy } from "@/i18n/why-content";
import { DEMO_SLUG } from "@/lib/demo-slugs";

export async function generateMetadata(): Promise<Metadata> {
  const copy = getWhyCopy(await getLocale());
  return {
    title: `${copy.kicker} — YourLauncher`,
    description: copy.subtitle,
  };
}

export default async function WhyPage() {
  const locale = await getLocale();
  const copy = getWhyCopy(locale);

  return (
    <>
      <Navbar />
      <main className="why-page">
        <section className="why-hero">
          <span className="page-kicker">{copy.kicker}</span>
          <h1>
            {copy.title} <span className="why-accent">{copy.titleAccent}</span>
          </h1>
          <p>{copy.subtitle}</p>
          <div className="why-actions">
            <Link href="/register" className="btn">
              {copy.ctaPrimary} <UiIcon name="arrow" size={17} />
            </Link>
            <Link
              href={`/preview/${DEMO_SLUG.yourLauncher}`}
              className="btn secondary"
            >
              {copy.ctaSecondary}
            </Link>
          </div>
        </section>

        <section className="why-section">
          <h2>{copy.reasonsTitle}</h2>
          <p className="why-intro">{copy.reasonsIntro}</p>
          <div className="why-grid">
            {copy.reasons.map((reason) => (
              <article key={reason.title} className="why-card">
                <span className="why-card-icon" aria-hidden>
                  {reason.icon}
                </span>
                <h3>{reason.title}</h3>
                <p>{reason.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="why-section">
          <AdSlot format="leaderboard" />
        </section>

        <section className="why-section">
          <h2>{copy.compareTitle}</h2>
          <p className="why-intro">{copy.compareIntro}</p>
          <div className="why-table-wrap">
            <table className="why-table">
              <thead>
                <tr>
                  <th />
                  <th className="why-us">{copy.compareUs}</th>
                  <th>{copy.compareOthers}</th>
                </tr>
              </thead>
              <tbody>
                {copy.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className="why-us">✓ {row.us}</td>
                    <td className="why-other">{row.others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="why-final">
          <h2>{copy.finalTitle}</h2>
          <p>{copy.finalSubtitle}</p>
          <Link href="/register" className="btn">
            {copy.ctaPrimary} <UiIcon name="arrow" size={17} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
