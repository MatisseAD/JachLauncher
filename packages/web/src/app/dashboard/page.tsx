import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import LauncherCard, { type LauncherSummary } from "@/components/LauncherCard";
import AdSlot from "@/components/AdSlot";
import { getSession } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const t = await getDict();

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
      updatedAt: true,
    },
  });

  const launchers: LauncherSummary[] = rows.map((l) => ({
    ...l,
    updatedAt: l.updatedAt.toISOString(),
  }));

  const published = launchers.filter((l) => l.status === "published").length;

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="row spread" style={{ marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0 }}>{t.dashboard.title}</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {launchers.length} {t.dashboard.launchersCount} · {published}{" "}
              {t.dashboard.publishedCount}
            </p>
          </div>
          <Link href="/dashboard/new" className="btn lg">
            {t.dashboard.newBtn}
          </Link>
        </div>

        {launchers.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: 50, marginTop: 20 }}
          >
            <div style={{ fontSize: 44, marginBottom: 10 }}>⛏️</div>
            <h3 style={{ marginTop: 0 }}>{t.dashboard.emptyTitle}</h3>
            <p className="muted">{t.dashboard.emptyDesc}</p>
            <Link
              href="/dashboard/new"
              className="btn lg"
              style={{ marginTop: 8 }}
            >
              {t.dashboard.emptyBtn}
            </Link>
          </div>
        ) : (
          <div className="grid cols-auto" style={{ marginTop: 20 }}>
            {launchers.map((l) => (
              <LauncherCard key={l.id} launcher={l} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <AdSlot format="leaderboard" />
        </div>
      </div>
    </>
  );
}
