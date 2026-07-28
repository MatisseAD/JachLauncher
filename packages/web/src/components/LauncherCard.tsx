"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assetUrl } from "@/lib/asset";
import UiIcon from "./UiIcon";

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
  published: "En ligne",
};

export default function LauncherCard({
  launcher,
}: {
  launcher: LauncherSummary;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [favorite, setFavorite] = useState(launcher.favorite);

  const thumb = assetUrl(launcher.backgroundUrl) ?? undefined;
  const thumbStyle = thumb
    ? { backgroundImage: `url(${thumb})` }
    : {
        background: `radial-gradient(circle at 75% 20%, ${launcher.secondaryColor}66, transparent 42%), linear-gradient(135deg, ${launcher.primaryColor}55, #11111a 70%)`,
      };
  const logo = assetUrl(launcher.logoUrl);

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    const response = await fetch(`/api/launchers/${launcher.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
    if (!response.ok) setFavorite(!next);
    router.refresh();
  }

  async function togglePublish() {
    setBusy(true);
    try {
      const next = launcher.status === "published" ? "draft" : "published";
      const response = await fetch(`/api/launchers/${launcher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body.error ?? "Impossible de modifier la publication.");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    try {
      const response = await fetch(`/api/launchers/${launcher.id}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body.error ?? "Impossible de dupliquer ce launcher.");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(`Supprimer « ${launcher.title} » ? Cette action est définitive.`)
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/launchers/${launcher.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        alert("Impossible de supprimer ce launcher.");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="launcher-card">
      <div className="launcher-cover" style={thumbStyle}>
        <button
          className={`favorite-button ${favorite ? "active" : ""}`}
          onClick={toggleFavorite}
          aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          title={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {favorite ? "★" : "☆"}
        </button>
        <span className={`status-chip ${launcher.status}`}>
          <i />
          {STATUS_LABEL[launcher.status] ?? launcher.status}
        </span>
        <div className="launcher-identity">
          {logo ? (
            <img src={logo} alt="" />
          ) : (
            <span style={{ background: launcher.primaryColor }}>
              {launcher.title.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h3>{launcher.title}</h3>
            <code>{launcher.slug}</code>
          </div>
        </div>
      </div>

      <div className="launcher-body">
        <p>{launcher.description || "Aucune description pour le moment."}</p>
        <div className="launcher-specs">
          <span>
            <UiIcon name="layers" size={14} />
            Minecraft {launcher.mcVersion}
          </span>
          <span>
            <UiIcon name="settings" size={14} />
            {launcher.loader}
          </span>
          <span>
            Mis à jour{" "}
            {new Date(launcher.updatedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <div className="launcher-actions">
          <Link className="btn secondary sm" href={`/dashboard/${launcher.id}`}>
            Configurer
          </Link>
          <Link
            className="icon-action"
            href={`/preview/${launcher.slug}`}
            target="_blank"
            aria-label="Ouvrir l’aperçu"
            title="Ouvrir l’aperçu"
          >
            <UiIcon name="external" size={16} />
          </Link>
          <button
            className="icon-action"
            disabled={busy}
            onClick={togglePublish}
            aria-label={
              launcher.status === "published" ? "Dépublier" : "Publier"
            }
            title={launcher.status === "published" ? "Dépublier" : "Publier"}
          >
            <UiIcon name="rocket" size={16} />
          </button>
          <button
            className="icon-action"
            disabled={busy}
            onClick={duplicate}
            aria-label="Dupliquer"
            title="Dupliquer"
          >
            <UiIcon name="layers" size={16} />
          </button>
          <button
            className="icon-action danger"
            disabled={busy}
            onClick={remove}
            aria-label="Supprimer"
            title="Supprimer"
          >
            ×
          </button>
        </div>
      </div>
    </article>
  );
}
