import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import UiIcon from "@/components/UiIcon";
import WizardEditor from "@/components/WizardEditor";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";

export default async function NewLauncherPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const launcherCount = await prisma.launcher.count({
    where: { ownerId: session.userId },
  });

  return (
    <DashboardShell username={session.username}>
      <section className="editor-heading">
        <div>
          <Link href="/dashboard" className="back-link">
            ← Retour au dashboard
          </Link>
          <span className="page-kicker">Assistant guidé</span>
          <h1>Créons ton launcher</h1>
          <p>
            Avance à ton rythme : chaque étape est expliquée et enregistrée.
          </p>
        </div>
        <span className="editor-quota">
          {launcherCount}/{MAX_LAUNCHERS_PER_USER} utilisés
        </span>
      </section>

      {launcherCount >= MAX_LAUNCHERS_PER_USER ? (
        <div className="limit-panel">
          <span>
            <UiIcon name="layers" size={28} />
          </span>
          <h2>Limite de launchers atteinte</h2>
          <p>
            Ton compte possède déjà {MAX_LAUNCHERS_PER_USER} launchers. Supprime
            ou réutilise un projet existant avant d’en créer un autre.
          </p>
          <Link href="/dashboard" className="btn">
            Revenir à mes launchers
          </Link>
        </div>
      ) : (
        <WizardEditor mode="create" />
      )}
    </DashboardShell>
  );
}
