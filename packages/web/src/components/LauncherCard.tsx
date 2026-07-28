"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assetUrl } from "@/lib/asset";
import UiIcon from "./UiIcon";
import { useI18n } from "@/i18n/I18nProvider";
import { getDashboardCopy } from "@/i18n/dashboard-content";

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

export default function LauncherCard({
  launcher,
}: {
  launcher: LauncherSummary;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = getDashboardCopy(locale).card;
  const statusLabel: Record<string, string> = {
    draft: copy.draft,
    ready: copy.ready,
    published: copy.online,
  };
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
        alert(body.error ?? copy.publishError);
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
        alert(body.error ?? copy.duplicateError);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`${copy.deleteConfirm}\n${launcher.title}`)) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/launchers/${launcher.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        alert(copy.deleteError);
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
          aria-label={favorite ? copy.removeFavorite : copy.addFavorite}
          title={favorite ? copy.removeFavorite : copy.addFavorite}
        >
          {favorite ? "★" : "☆"}
        </button>
        <span className={`status-chip ${launcher.status}`}>
          <i />
          {statusLabel[launcher.status] ?? launcher.status}
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
        <p>{launcher.description || copy.noDescription}</p>
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
            {copy.updated}{" "}
            {new Date(launcher.updatedAt).toLocaleDateString(locale, {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <div className="launcher-actions">
          <Link className="btn secondary sm" href={`/dashboard/${launcher.id}`}>
            {copy.configure}
          </Link>
          <Link
            className="icon-action"
            href={`/preview/${launcher.slug}`}
            target="_blank"
            aria-label={copy.openPreview}
            title={copy.openPreview}
          >
            <UiIcon name="external" size={16} />
          </Link>
          <button
            className="icon-action"
            disabled={busy}
            onClick={togglePublish}
            aria-label={
              launcher.status === "published" ? copy.unpublish : copy.publish
            }
            title={
              launcher.status === "published" ? copy.unpublish : copy.publish
            }
          >
            <UiIcon name="rocket" size={16} />
          </button>
          <button
            className="icon-action"
            disabled={busy}
            onClick={duplicate}
            aria-label={copy.duplicate}
            title={copy.duplicate}
          >
            <UiIcon name="layers" size={16} />
          </button>
          <button
            className="icon-action danger"
            disabled={busy}
            onClick={remove}
            aria-label={copy.remove}
            title={copy.remove}
          >
            ×
          </button>
        </div>
      </div>
    </article>
  );
}
