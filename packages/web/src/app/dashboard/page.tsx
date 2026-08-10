import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import AdSlot from "@/components/AdSlot";
import DashboardShell from "@/components/DashboardShell";
import LauncherCard, { type LauncherSummary } from "@/components/LauncherCard";
import UiIcon from "@/components/UiIcon";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_LAUNCHERS_PER_USER } from "@/lib/launcher-limits";
import { getLocale } from "@/i18n/server";
import { getDashboardCopy } from "@/i18n/dashboard-content";
import { assetUrl } from "@/lib/asset";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function safeArrayLength(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const copy = getDashboardCopy(locale).page;

  const today = new Date();
  const startDay = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - 6,
    ),
  );

  const [rows, profile] = await Promise.all([
    prisma.launcher.findMany({
      where: { ownerId: session.userId },
      orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        favorite: true,
        logoUrl: true,
        backgroundUrl: true,
        primaryColor: true,
        secondaryColor: true,
        mcVersion: true,
        loader: true,
        launcherType: true,
        mods: true,
        resourcepacks: true,
        shaderpacks: true,
        news: true,
        updatedAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, avatarUrl: true, role: true },
    }),
  ]);

  const launchers: LauncherSummary[] = rows.map((launcher) => ({
    ...launcher,
    updatedAt: launcher.updatedAt.toISOString(),
  }));
  const published = launchers.filter(
    (launcher) => launcher.status === "published",
  ).length;
  const drafts = launchers.length - published;
  const contentFiles = rows.reduce(
    (total, launcher) =>
      total +
      safeArrayLength(launcher.mods) +
      safeArrayLength(launcher.resourcepacks) +
      safeArrayLength(launcher.shaderpacks),
    0,
  );

  const activity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startDay.getTime() + index * DAY_MS);
    const nextDay = new Date(day.getTime() + DAY_MS);
    const value = rows.filter(
      (launcher) =>
        launcher.updatedAt.getTime() >= day.getTime() &&
        launcher.updatedAt.getTime() < nextDay.getTime(),
    ).length;
    return {
      label: day.toLocaleDateString(locale, { weekday: "short" }).slice(0, 2),
      value,
    };
  });
  const totalActivity = activity.reduce((sum, day) => sum + day.value, 0);
  const maxActivity = Math.max(...activity.map((day) => day.value), 1);
  const quotaPercent = Math.round(
    (launchers.length / MAX_LAUNCHERS_PER_USER) * 100,
  );
  const canCreate = launchers.length < MAX_LAUNCHERS_PER_USER;
  const downloadUrl = process.env.NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL;

  return (
    <DashboardShell
      username={profile?.username ?? session.username}
      avatarUrl={assetUrl(profile?.avatarUrl)}
      isAdmin={profile?.role === "admin"}
    >
      <section className="dashboard-heading">
        <div>
          <span className="page-kicker">{copy.overview}</span>
          <h1>
            {copy.hello}
            <span className="dashboard-username">
              {profile?.username ?? session.username}
            </span>
          </h1>
          <p>{copy.intro}</p>
        </div>
        {canCreate ? (
          <Link href="/dashboard/new" className="btn">
            <UiIcon name="plus" size={18} />
            {copy.newLauncher}
          </Link>
        ) : (
          <span className="btn is-disabled" title={copy.limit}>
            {copy.limit}
          </span>
        )}
      </section>

      <section className="metric-grid" aria-label="Statistiques principales">
        <article className="metric-card">
          <span className="metric-icon violet">
            <UiIcon name="layers" />
          </span>
          <div>
            <span className="metric-label">{copy.launchers}</span>
            <strong>{launchers.length}</strong>
            <small>
              {MAX_LAUNCHERS_PER_USER} {copy.available}
            </small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <UiIcon name="server" />
          </span>
          <div>
            <span className="metric-label">{copy.production}</span>
            <strong>{published}</strong>
            <small>
              {drafts} {copy.drafts}
            </small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon blue">
            <UiIcon name="activity" />
          </span>
          <div>
            <span className="metric-label">{copy.loads}</span>
            <strong>{totalActivity}</strong>
            <small>{copy.appSevenDays}</small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon amber">
            <UiIcon name="download" />
          </span>
          <div>
            <span className="metric-label">{copy.content}</span>
            <strong>{contentFiles}</strong>
            <small>{copy.contentKinds}</small>
          </div>
        </article>
      </section>

      <section className="dashboard-overview-grid">
        <article className="panel activity-panel">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">{copy.playerActivity}</span>
              <h2>{copy.launcherLoads}</h2>
            </div>
            <span className="trend-badge">{copy.sevenDays}</span>
          </div>
          <div className="chart-summary">
            <strong>{totalActivity}</strong>
            <span>{copy.configOpenings}</span>
          </div>
          <div className="activity-chart">
            {activity.map((day) => (
              <div className="chart-column" key={day.label}>
                <span className="chart-value">{day.value}</span>
                <div className="chart-track">
                  <i
                    style={{
                      height: `${Math.max((day.value / maxActivity) * 100, 6)}%`,
                    }}
                  />
                </div>
                <span className="chart-label">{day.label}</span>
              </div>
            ))}
          </div>
          <p className="privacy-note">
            <UiIcon name="shield" size={15} />
            {copy.privateMetric}
          </p>
        </article>

        <article className="panel quota-panel">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">{copy.capacity}</span>
              <h2>{copy.slots}</h2>
            </div>
            <span className="quota-value">
              {launchers.length}/{MAX_LAUNCHERS_PER_USER}
            </span>
          </div>
          <div
            className="quota-ring"
            style={{ "--quota": `${quotaPercent}%` } as CSSProperties}
          >
            <div>
              <strong>
                {Math.max(MAX_LAUNCHERS_PER_USER - launchers.length, 0)}
              </strong>
              <span>{copy.freeSlots}</span>
            </div>
          </div>
          <p>
            {copy.quotaText} ({MAX_LAUNCHERS_PER_USER})
          </p>
        </article>
      </section>

      <section className="launchers-section">
        <div className="section-title-row">
          <div>
            <span className="page-kicker">{copy.projects}</span>
            <h2>{copy.myLaunchers}</h2>
          </div>
          <span>
            {launchers.length} {copy.project}
          </span>
        </div>

        {launchers.length === 0 ? (
          <div className="empty-launchers">
            <span className="empty-icon">
              <UiIcon name="rocket" size={30} />
            </span>
            <h3>{copy.emptyTitle}</h3>
            <p>{copy.emptyText}</p>
            <Link href="/dashboard/new" className="btn">
              <UiIcon name="plus" size={17} />
              {copy.start}
            </Link>
          </div>
        ) : (
          <div className="launcher-grid">
            {launchers.map((launcher) => (
              <LauncherCard key={launcher.id} launcher={launcher} />
            ))}
          </div>
        )}
      </section>

      <section className="download-panel" id="telecharger">
        <div className="download-visual">
          <span className="windows-badge">
            <UiIcon name="windows" size={28} />
          </span>
          <div className="download-window">
            <i />
            <i />
            <i />
            <div className="download-window-content">
              <UiIcon name="rocket" size={32} />
              <span>{copy.ready}</span>
            </div>
          </div>
        </div>
        <div className="download-copy">
          <span className="page-kicker">{copy.playerApp}</span>
          <h2>{copy.downloadTitle}</h2>
          <p>{copy.downloadText}</p>
          <ol className="download-steps">
            <li>
              <span>1</span> {copy.downloadSteps[0]}
            </li>
            <li>
              <span>2</span> {copy.downloadSteps[1]}
            </li>
            <li>
              <span>3</span> {copy.downloadSteps[2]}
            </li>
          </ol>
          <div className="row wrap">
            {downloadUrl ? (
              <a className="btn" href={downloadUrl}>
                <UiIcon name="download" size={18} />
                {copy.download}
              </a>
            ) : (
              <span
                className="btn is-disabled"
                title="Configure NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL pour publier le build."
              >
                <UiIcon name="windows" size={18} />
                {copy.soon}
              </span>
            )}
            <Link className="text-link" href="/help#installation">
              {copy.fullGuide} <UiIcon name="arrow" size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-ad">
        <AdSlot format="leaderboard" />
      </section>
    </DashboardShell>
  );
}
