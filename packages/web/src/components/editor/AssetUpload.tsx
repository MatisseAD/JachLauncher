"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/asset";

/**
 * Champ d'upload d'image (logo / fond) avec aperçu, upload de fichier
 * (si le launcher est déjà enregistré) et saisie d'URL en alternative.
 */
export default function AssetUpload({
  label,
  hint,
  kind,
  value,
  launcherId,
  onChange,
}: {
  label: string;
  hint?: string;
  kind: "logo" | "background";
  value?: string | null;
  launcherId?: string;
  onChange: (val: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (!launcherId) return;
    setError("");
    setUploading(true);
    const form = new FormData();
    form.append("launcherId", launcherId);
    form.append("kind", kind);
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setUploading(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Échec de l'upload");
      return;
    }
    onChange(json.relativePath);
  }

  const preview = assetUrl(value);

  return (
    <div className="field">
      <label>{label}</label>
      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: kind === "logo" ? 64 : 110,
            height: 64,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: preview
              ? `url(${preview}) center/cover`
              : "var(--panel-2)",
            flex: "none",
            display: "grid",
            placeItems: "center",
            color: "var(--text-faint)",
            fontSize: 11,
          }}
        >
          {!preview && "Aucune"}
        </div>
        <div style={{ flex: 1 }}>
          <input
            type="file"
            accept="image/*"
            disabled={!launcherId || uploading}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          {!launcherId && (
            <div className="hint">
              Enregistre le launcher pour activer l&apos;upload de fichiers.
            </div>
          )}
          <input
            type="url"
            placeholder="…ou colle une URL d'image"
            defaultValue={value && /^https?:/.test(value) ? value : ""}
            onBlur={(e) => e.target.value && onChange(e.target.value)}
            style={{ marginTop: 8 }}
          />
          {value && (
            <button
              className="btn ghost sm"
              type="button"
              style={{ marginTop: 8 }}
              onClick={() => onChange(null)}
            >
              Retirer
            </button>
          )}
          {uploading && <div className="hint">Envoi…</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
