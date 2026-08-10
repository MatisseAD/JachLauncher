import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import UiIcon from "@/components/UiIcon";
import WizardEditor from "@/components/WizardEditor";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";
import { assetUrl } from "@/lib/asset";
import { getLocale } from "@/i18n/server";
import { getDashboardCopy } from "@/i18n/dashboard-content";

export default async function NewLauncherPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const copy = getDashboardCopy(locale).editor;
  const [launcherCount, profile] = await Promise.all([
    prisma.launcher.count({
      where: { ownerId: session.userId },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, avatarUrl: true, role: true },
    }),
  ]);

  return (
    <DashboardShell
      username={profile?.username ?? session.username}
      avatarUrl={assetUrl(profile?.avatarUrl)}
      isAdmin={profile?.role === "admin"}
    >
      <section className="editor-heading">
        <div>
          <Link href="/dashboard" className="back-link">
            ← {copy.back}
          </Link>
          <span className="page-kicker">{copy.guided}</span>
          <h1>{copy.createTitle}</h1>
          <p>{copy.createIntro}</p>
        </div>
        <span className="editor-quota">
          {launcherCount}/{MAX_LAUNCHERS_PER_USER} {copy.used}
        </span>
      </section>

      {launcherCount >= MAX_LAUNCHERS_PER_USER ? (
        <div className="limit-panel">
          <span>
            <UiIcon name="layers" size={28} />
          </span>
          <h2>{copy.limitTitle}</h2>
          <p>
            {copy.limitText.replace("{max}", String(MAX_LAUNCHERS_PER_USER))}
          </p>
          <Link href="/dashboard" className="btn">
            {copy.backToLaunchers}
          </Link>
        </div>
      ) : (
        <WizardEditor mode="create" />
      )}
    </DashboardShell>
  );
}
