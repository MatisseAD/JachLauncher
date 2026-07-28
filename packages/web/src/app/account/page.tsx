import { redirect } from "next/navigation";
import ChangePassword from "@/components/ChangePassword";
import AccountProfileEditor from "@/components/AccountProfileEditor";
import DashboardShell from "@/components/DashboardShell";
import UiIcon from "@/components/UiIcon";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";
import { getLocale } from "@/i18n/server";
import { getAccountCopy } from "@/i18n/account-content";
import { assetUrl } from "@/lib/asset";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const copy = getAccountCopy(locale).page;

  const [count, published, user] = await prisma.$transaction([
    prisma.launcher.count({ where: { ownerId: session.userId } }),
    prisma.launcher.count({
      where: { ownerId: session.userId, status: "published" },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { createdAt: true, username: true, email: true, avatarUrl: true },
    }),
  ]);
  const resolvedAvatarUrl = assetUrl(user?.avatarUrl);

  return (
    <DashboardShell
      username={user?.username ?? session.username}
      avatarUrl={resolvedAvatarUrl}
    >
      <section className="dashboard-heading account-heading">
        <div>
          <span className="page-kicker">{copy.settings}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
      </section>

      <div className="account-grid">
        <section className="panel profile-panel">
          <div className="profile-avatar">
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt="" />
            ) : (
              session.username.charAt(0).toUpperCase()
            )}
          </div>
          <h2>{user?.username ?? session.username}</h2>
          <p>{copy.creator}</p>
          <div className="profile-stats">
            <div>
              <strong>{count}</strong>
              <span>{copy.launchers}</span>
            </div>
            <div>
              <strong>{published}</strong>
              <span>{copy.published}</span>
            </div>
            <div>
              <strong>{MAX_LAUNCHERS_PER_USER - count}</strong>
              <span>{copy.freeSlots}</span>
            </div>
          </div>
          <span className="member-since">
            <UiIcon name="sparkles" size={15} />
            {copy.memberSince}{" "}
            {user?.createdAt.toLocaleDateString(locale, {
              month: "long",
              year: "numeric",
            })}
          </span>
        </section>

        <section className="panel account-details-panel">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">{copy.identity}</span>
              <h2>{copy.profile}</h2>
            </div>
            <span className="metric-icon purple">
              <UiIcon name="user" size={19} />
            </span>
          </div>
          <AccountProfileEditor
            username={user?.username ?? session.username}
            email={user?.email}
            avatarUrl={resolvedAvatarUrl}
          />
        </section>

        <section className="panel security-panel">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">{copy.security}</span>
              <h2>{copy.passwordTitle}</h2>
            </div>
            <span className="metric-icon green">
              <UiIcon name="shield" size={19} />
            </span>
          </div>
          <p>{copy.passwordText}</p>
          <ChangePassword />
        </section>
      </div>
    </DashboardShell>
  );
}
