import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import WizardEditor from "@/components/WizardEditor";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rowToForm } from "@/lib/launcher-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLauncherPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const l = await prisma.launcher.findUnique({ where: { id } });
  if (!l || l.ownerId !== session.userId) notFound();

  return (
    <DashboardShell username={session.username}>
      <section className="editor-heading">
        <div>
          <Link href="/dashboard" className="back-link">
            ← Retour au dashboard
          </Link>
          <span className="page-kicker">Configuration</span>
          <h1>{l.title}</h1>
          <p>Modifie l’expérience puis prévisualise avant de publier.</p>
        </div>
        <span className={`badge ${l.status}`}>
          <span className="dot" />
          {l.status === "published"
            ? "Publié"
            : l.status === "ready"
              ? "Prêt"
              : "Brouillon"}
        </span>
      </section>
      <WizardEditor mode="edit" initial={rowToForm(l)} />
    </DashboardShell>
  );
}
