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

  const today = new Date();
  const startDay = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - 6,
    ),
  );

  const rows = await prisma.launcher.findMany({
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
      dailyMetrics: {
        where: { day: { gte: startDay } },
        select: { day: true, manifestLoads: true },
      },
    },
  });

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
    const value = rows.reduce(
      (sum, launcher) =>
        sum +
        launcher.dailyMetrics
          .filter((metric) => metric.day.getTime() === day.getTime())
          .reduce((metricSum, metric) => metricSum + metric.manifestLoads, 0),
      0,
    );
    return {
      label: day.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 2),
      value,
    };
  });
  const totalLoads = activity.reduce((sum, day) => sum + day.value, 0);
  const maxActivity = Math.max(...activity.map((day) => day.value), 1);
  const quotaPercent = Math.round(
    (launchers.length / MAX_LAUNCHERS_PER_USER) * 100,
  );
  const canCreate = launchers.length < MAX_LAUNCHERS_PER_USER;
  const downloadUrl = process.env.NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL;

  return (
    <DashboardShell username={session.username}>
      <section className="dashboard-heading">
        <div>
          <span className="page-kicker">Vue d’ensemble</span>
          <h1>
            Bonjour
            <span className="dashboard-username">{session.username}</span>
          </h1>
          <p>
            Pilote tes launchers, suis leur utilisation et publie tes mises à
            jour depuis un seul espace.
          </p>
        </div>
        {canCreate ? (
          <Link href="/dashboard/new" className="btn">
            <UiIcon name="plus" size={18} />
            Nouveau launcher
          </Link>
        ) : (
          <span
            className="btn is-disabled"
            title="Limite de launchers atteinte"
          >
            Limite atteinte
          </span>
        )}
      </section>

      <section className="metric-grid" aria-label="Statistiques principales">
        <article className="metric-card">
          <span className="metric-icon violet">
            <UiIcon name="layers" />
          </span>
          <div>
            <span className="metric-label">Launchers</span>
            <strong>{launchers.length}</strong>
            <small>sur {MAX_LAUNCHERS_PER_USER} disponibles</small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <UiIcon name="server" />
          </span>
          <div>
            <span className="metric-label">En production</span>
            <strong>{published}</strong>
            <small>
              {drafts} brouillon{drafts > 1 ? "s" : ""}
            </small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon blue">
            <UiIcon name="activity" />
          </span>
          <div>
            <span className="metric-label">Chargements</span>
            <strong>{totalLoads}</strong>
            <small>via l’application · 7 jours</small>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon amber">
            <UiIcon name="download" />
          </span>
          <div>
            <span className="metric-label">Contenus distribués</span>
            <strong>{contentFiles}</strong>
            <small>mods, packs et shaders</small>
          </div>
        </article>
      </section>

      <section className="dashboard-overview-grid">
        <article className="panel activity-panel">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">Activité joueurs</span>
              <h2>Chargements du launcher</h2>
            </div>
            <span className="trend-badge">7 derniers jours</span>
          </div>
          <div className="chart-summary">
            <strong>{totalLoads}</strong>
            <span>
              ouverture{totalLoads > 1 ? "s" : ""} de configuration depuis
              l’application desktop
            </span>
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
            Mesure agrégée, sans adresse IP ni identifiant joueur.
          </p>
        </article>

        <article className="panel quota-panel">
          <div className="panel-head">
            <div>
              <span className="panel-eyebrow">Capacité du compte</span>
              <h2>Launchers disponibles</h2>
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
              <span>
                place{launchers.length < 2 ? "s" : ""} libre
                {launchers.length < 2 ? "s" : ""}
              </span>
            </div>
          </div>
          <p>
            La limite actuelle est fixée à {MAX_LAUNCHERS_PER_USER} launchers
            par créateur pour garantir une infrastructure stable.
          </p>
        </article>
      </section>

      <section className="launchers-section">
        <div className="section-title-row">
          <div>
            <span className="page-kicker">Tes projets</span>
            <h2>Mes launchers</h2>
          </div>
          <span>
            {launchers.length} projet{launchers.length > 1 ? "s" : ""}
          </span>
        </div>

        {launchers.length === 0 ? (
          <div className="empty-launchers">
            <span className="empty-icon">
              <UiIcon name="rocket" size={30} />
            </span>
            <h3>Crée ton premier launcher</h3>
            <p>
              Choisis son identité, connecte ton serveur et publie une
              expérience prête à jouer en quelques minutes.
            </p>
            <Link href="/dashboard/new" className="btn">
              <UiIcon name="plus" size={17} />
              Démarrer la création
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
              <span>Prêt à jouer</span>
            </div>
          </div>
        </div>
        <div className="download-copy">
          <span className="page-kicker">Application joueurs</span>
          <h2>Télécharger YourLauncher</h2>
          <p>
            Tes joueurs installent une seule application, saisissent le code de
            ton launcher publié et retrouvent automatiquement la bonne version,
            les mods et les ressources.
          </p>
          <ol className="download-steps">
            <li>
              <span>1</span> Télécharge et installe l’application Windows.
            </li>
            <li>
              <span>2</span> Connecte ton compte Minecraft.
            </li>
            <li>
              <span>3</span> Entre le code affiché sur ton launcher publié.
            </li>
          </ol>
          <div className="row wrap">
            {downloadUrl ? (
              <a className="btn" href={downloadUrl}>
                <UiIcon name="download" size={18} />
                Télécharger pour Windows
              </a>
            ) : (
              <span
                className="btn is-disabled"
                title="Configure NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL pour publier le build."
              >
                <UiIcon name="windows" size={18} />
                Build Windows bientôt disponible
              </span>
            )}
            <Link className="text-link" href="/help#installation">
              Lire le guide complet <UiIcon name="arrow" size={15} />
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
