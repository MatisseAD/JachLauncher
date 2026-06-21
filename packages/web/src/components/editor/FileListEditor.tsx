"use client";

import type { DownloadableFile } from "@jach/shared";
import { emptyMod } from "@/lib/launcher-types";

/**
 * Éditeur d'une liste de fichiers téléchargeables (mods, resource packs,
 * shaders). Chaque entrée : icône, nom, fichier, URL, version, requis.
 */
export default function FileListEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: DownloadableFile[];
  onChange: (items: DownloadableFile[]) => void;
}) {
  function add() {
    onChange([...items, emptyMod()]);
  }
  function update(i: number, patch: Partial<DownloadableFile>) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="field">
      <div className="row spread" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          {label} <span className="pill">{items.length}</span>
        </label>
        <button className="btn secondary sm" type="button" onClick={add}>
          + Ajouter
        </button>
      </div>
      {hint && <div className="hint" style={{ marginBottom: 10 }}>{hint}</div>}

      {items.length === 0 && (
        <div className="hint">Rien pour l&apos;instant. Clique sur « Ajouter ».</div>
      )}

      {items.map((m, i) => (
        <div className="card tight" key={m.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="grid cols-2" style={{ gap: 10 }}>
                <div>
                  <input
                    placeholder="Nom (ex : Sodium)"
                    value={m.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </div>
                <div>
                  <input
                    placeholder="Nom de fichier (sodium-0.5.8.jar)"
                    value={m.fileName}
                    onChange={(e) => update(i, { fileName: e.target.value })}
                  />
                </div>
              </div>
              <input
                placeholder="URL directe du téléchargement (.jar / .zip)"
                value={m.url}
                onChange={(e) => update(i, { url: e.target.value })}
                style={{ marginTop: 8 }}
              />
              <div className="grid cols-2" style={{ gap: 10, marginTop: 8 }}>
                <input
                  placeholder="URL d'icône (optionnel)"
                  value={m.iconUrl ?? ""}
                  onChange={(e) => update(i, { iconUrl: e.target.value || undefined })}
                />
                <input
                  placeholder="Version (optionnel)"
                  value={m.version ?? ""}
                  onChange={(e) => update(i, { version: e.target.value || undefined })}
                />
              </div>
              <input
                placeholder="Courte description (optionnel)"
                value={m.description ?? ""}
                onChange={(e) => update(i, { description: e.target.value || undefined })}
                style={{ marginTop: 8 }}
              />
              <label className="switch" style={{ marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={m.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
                <span className="track" />
                Installé automatiquement
              </label>
            </div>
            <button className="icon-btn" type="button" onClick={() => remove(i)} title="Supprimer">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
