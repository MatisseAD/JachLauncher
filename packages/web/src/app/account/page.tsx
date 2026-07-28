import { redirect } from "next/navigation";
import ChangePassword from "@/components/ChangePassword";
import DashboardShell from "@/components/DashboardShell";
import UiIcon from "@/components/UiIcon";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [count, published, user] = await prisma.$transaction([
    prisma.launcher.count({ where: { ownerId: session.userId } }),
    prisma.launcher.count({
      where: { ownerId: session.userId, status: "published" },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { createdAt: true },
    }),
  ]);

  return (
    <DashboardShell username={session.username}>
      <section className="dashboard-heading account-heading">
        <div>
          <span className="page-kicker">Paramètres</span>
          <h1>Mon compte</h1>
          <p>Gère ton profil créateur et la sécurité de ta session.</p>
        </div>
      </section>

      <div className="account-grid">
        <section className="panel profile-panel">
          <div className="profile-avatar">
            {session.username.charAt(0).toUpperCase()}
          </div>
          <h2>{session.username}</h2>
          <p>Créateur YourLauncher</p>
          <div className="profile-stats">
            <div>
              <strong>{count}</strong>
              <span>Launchers</span>
            </div>
            <div>
              <strong>{published}</strong>
              <span>Publiés</span>
            </div>
            <div>
              <strong>{MAX_LAUNCHERS_PER_USER - count}</strong>
              <span>Places libres</span>
            </div>
          </div>
          <span className="member-since">
            <UiIcon name="sparkles" size={15} />
            Membre depuis{" "}
            {user?.createdAt.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </section>

        <section className="panel security-panel">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">Sécurité</span>
              <h2>Modifier le mot de passe</h2>
            </div>
            <span className="metric-icon green">
              <UiIcon name="shield" size={19} />
            </span>
          </div>
          <p>
            Utilise un mot de passe unique d’au moins six caractères pour
            protéger ton espace.
          </p>
          <ChangePassword />
        </section>
      </div>
    </DashboardShell>
  );
}
