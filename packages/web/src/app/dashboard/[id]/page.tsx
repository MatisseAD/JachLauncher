import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
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
    <>
      <Navbar />
      <div className="container">
        <div className="row spread" style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0 }}>{l.title}</h2>
          <span className={`badge ${l.status}`}>
            <span className="dot" />
            {l.status === "published" ? "Publié" : l.status === "ready" ? "Prêt" : "Brouillon"}
          </span>
        </div>
        <WizardEditor mode="edit" initial={rowToForm(l)} />
      </div>
    </>
  );
}
