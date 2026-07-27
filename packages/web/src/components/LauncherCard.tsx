"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assetUrl } from "@/lib/asset";

export interface LauncherSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  favorite: boolean;
  logoUrl: string | null;
  backgroundUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  mcVersion: string;
  loader: string;
  launcherType: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prêt",
  published: "Publié",
};

export default function LauncherCard({
  launcher,
}: {
  launcher: LauncherSummary;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [fav, setFav] = useState(launcher.favorite);

  const thumb = assetUrl(launcher.backgroundUrl) ?? undefined;
  const thumbStyle = thumb
    ? { backgroundImage: `url(${thumb})` }
    : {
        background: `linear-gradient(120deg, ${launcher.primaryColor}, ${launcher.secondaryColor})`,
      };
  const logo = assetUrl(launcher.logoUrl);

  async function toggleFav() {
    setFav((f) => !f);
    await fetch(`/api/launchers/${launcher.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !fav }),
    });
    router.refresh();
  }

  async function togglePublish() {
    setBusy(true);
    const next = launcher.status === "published" ? "draft" : "published";
    await fetch(`/api/launchers/${launcher.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/launchers/${launcher.id}/duplicate`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (
      !confirm(`Supprimer « ${launcher.title} » ? Cette action est définitive.`)
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/launchers/${launcher.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="launcher-card">
      <div className="thumb" style={thumbStyle}>
        {logo && <img className="logo" src={logo} alt="" />}
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}>
          <span className={`badge ${launcher.status}`}>
            <span className="dot" />
            {STATUS_LABEL[launcher.status] ?? launcher.status}
          </span>
        </div>
        <div
          className={`star ${fav ? "on" : ""}`}
          style={{ position: "absolute", top: 10, left: 12, zIndex: 1 }}
          onClick={toggleFav}
          title="Favori"
        >
          {fav ? "★" : "☆"}
        </div>
      </div>

      <div className="body">
        <div style={{ fontWeight: 800, fontSize: 16 }}>{launcher.title}</div>
        <div className="muted" style={{ fontSize: 12, minHeight: 18 }}>
          {launcher.description || "Sans description"}
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          <span className="pill">{launcher.mcVersion}</span>
          <span className="pill">{launcher.loader}</span>
          <span className="pill">
            modifié le{" "}
            {new Date(launcher.updatedAt).toLocaleDateString("fr-FR")}
          </span>
        </div>

        <div className="actions">
          <Link className="btn secondary sm" href={`/dashboard/${launcher.id}`}>
            ✎ Modifier
          </Link>
          <Link
            className="btn ghost sm"
            href={`/preview/${launcher.slug}`}
            target="_blank"
          >
            👁 Aperçu
          </Link>
          <button
            className="btn ghost sm"
            disabled={busy}
            onClick={togglePublish}
          >
            {launcher.status === "published" ? "Dépublier" : "🚀 Générer"}
          </button>
          {launcher.status === "published" && (
            <a
              className="btn ghost sm"
              href={`/api/manifest/${launcher.slug}?download=1`}
              download
            >
              ⬇
            </a>
          )}
          <button
            className="btn ghost sm"
            disabled={busy}
            onClick={duplicate}
            title="Dupliquer"
          >
            ⧉
          </button>
          <button
            className="btn ghost sm"
            disabled={busy}
            onClick={remove}
            title="Supprimer"
            style={{ color: "var(--danger)" }}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
