import Link from "next/link";
import { notFound } from "next/navigation";
import LauncherPreview from "@/components/LauncherPreview";
import LogoMark from "@/components/LogoMark";
import { prisma } from "@/lib/db";
import { rowToForm } from "@/lib/launcher-data";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// Page d'aperçu plein écran, publique (sert aussi de "Voir un exemple").
export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;
  const l = await prisma.launcher.findUnique({ where: { slug } });
  if (!l) notFound();
  const session = await getSession();
  if (l.status !== "published" && l.ownerId !== session?.userId) notFound();

  const data = rowToForm(l);

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <div className="navbar">
        <Link href="/" className="brand">
          <LogoMark />
        </Link>
        <div className="row" style={{ gap: 12 }}>
          <span className="badge">Aperçu · {data.title}</span>
          <Link href="/dashboard" className="btn ghost sm">
            Retour
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
              💬 {data.preLaunchMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
