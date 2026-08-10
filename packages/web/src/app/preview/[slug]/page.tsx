import Link from "next/link";
import { notFound } from "next/navigation";
import LauncherPreview from "@/components/LauncherPreview";
import LogoMark from "@/components/LogoMark";
import { prisma } from "@/lib/db";
import { rowToForm } from "@/lib/launcher-data";
import { getSession } from "@/lib/auth";
import { getDemoLauncher } from "@/lib/demo-launchers";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// Page d'aperçu plein écran, publique (sert aussi de "Voir un exemple").
export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;
  const demo = getDemoLauncher(slug);
  // Une démo intégrée reste prioritaire même si une ancienne base contient
  // encore une ligne ayant le même slug désormais réservé.
  const l = demo
    ? null
    : await prisma.launcher.findUnique({ where: { slug } }).catch(() => null);
  if (!l && !demo) notFound();
  const session = await getSession();
  const locale = await getLocale();
  const labels = {
    fr: { preview: "Aperçu", back: "Retour", message: "Message de lancement" },
    en: { preview: "Preview", back: "Back", message: "Launch message" },
    es: {
      preview: "Vista previa",
      back: "Volver",
      message: "Mensaje de inicio",
    },
    de: { preview: "Vorschau", back: "Zurück", message: "Startmeldung" },
    pt: { preview: "Prévia", back: "Voltar", message: "Mensagem de início" },
    it: {
      preview: "Anteprima",
      back: "Indietro",
      message: "Messaggio di avvio",
    },
  }[locale];
  if (l && l.status !== "published" && l.ownerId !== session?.userId)
    notFound();

  const data = l ? rowToForm(l) : demo!;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <div className="navbar">
        <Link href="/" className="brand">
          <LogoMark />
        </Link>
        <div className="row" style={{ gap: 12 }}>
          <span className="badge">
            {labels.preview} · {data.title}
          </span>
          <Link href="/dashboard" className="btn ghost sm">
            {labels.back}
          </Link>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: 30,
        }}
      >
        <div style={{ width: "min(1100px, 100%)" }}>
          <LauncherPreview data={data} fullscreen />
          {data.preLaunchMessage && (
            <p className="muted center" style={{ marginTop: 16 }}>
              💬 {labels.message}: {data.preLaunchMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
