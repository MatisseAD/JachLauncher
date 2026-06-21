import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getDict } from "@/i18n/server";

export default async function HelpPage() {
  const t = await getDict();
  return (
    <>
      <Navbar />
      <div className="container narrow">
        <h2>{t.help.title}</h2>
        <p className="muted">{t.help.subtitle}</p>

        <div className="grid" style={{ marginTop: 20 }}>
          {t.help.steps.map((s, i) => (
            <div className="card row" key={i} style={{ alignItems: "flex-start", gap: 16 }}>
              <div className="step-num" style={{ flex: "none" }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 32 }}>{t.help.faqTitle}</h3>
        <div className="grid">
          {t.help.faq.map((f, i) => (
            <div className="card" key={i}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{f.q}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {f.a}
              </div>
            </div>
          ))}
        </div>

        <div className="card center" style={{ marginTop: 24, padding: 32 }}>
          <h3 style={{ marginTop: 0 }}>{t.help.ctaTitle}</h3>
          <Link href="/dashboard/new" className="btn lg">
            {t.help.ctaBtn}
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
