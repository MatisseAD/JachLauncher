import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import WizardEditor from "@/components/WizardEditor";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rowToForm } from "@/lib/launcher-data";
import { assetUrl } from "@/lib/asset";
import { getLocale } from "@/i18n/server";
import { getDashboardCopy } from "@/i18n/dashboard-content";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLauncherPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const locale = await getLocale();
  const copy = getDashboardCopy(locale).editor;

  const [l, profile] = await Promise.all([
    prisma.launcher.findUnique({ where: { id } }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, avatarUrl: true, role: true },
    }),
  ]);
  if (!l || l.ownerId !== session.userId) notFound();

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
          <span className="page-kicker">{copy.configuration}</span>
          <h1>{l.title}</h1>
          <p>{copy.editIntro}</p>
        </div>
        <span className={`badge ${l.status}`}>
          <span className="dot" />
          {l.status === "published"
            ? copy.published
            : l.status === "ready"
              ? copy.ready
              : copy.draft}
        </span>
      </section>
      <WizardEditor mode="edit" initial={rowToForm(l)} />
    </DashboardShell>
  );
}
