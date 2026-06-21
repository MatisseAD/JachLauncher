"use client";

import type { NewsEntry } from "@jach/shared";
import { emptyNews } from "@/lib/launcher-types";

/** Éditeur des actualités affichées dans le launcher. */
export default function NewsEditor({
  items,
  onChange,
}: {
  items: NewsEntry[];
  onChange: (items: NewsEntry[]) => void;
}) {
  function add() {
    onChange([...items, emptyNews()]);
  }
  function update(i: number, patch: Partial<NewsEntry>) {
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
          Actualités <span className="pill">{items.length}</span>
        </label>
        <button className="btn secondary sm" type="button" onClick={add}>
          + Ajouter une actu
        </button>
      </div>

      {items.length === 0 && (
        <div className="hint">
          Ajoute des actus pour que ton launcher ressemble à un vrai launcher de serveur.
        </div>
      )}

      {items.map((n, i) => (
        <div className="card tight" key={n.id} style={{ marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="grid cols-2" style={{ gap: 10 }}>
                <input
                  placeholder="Titre (ex : Ouverture saison 3 !)"
                  value={n.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
                <input
                  type="date"
                  value={n.date}
                  onChange={(e) => update(i, { date: e.target.value })}
                />
              </div>
              <textarea
                placeholder="Courte description"
                value={n.description}
                onChange={(e) => update(i, { description: e.target.value })}
                style={{ marginTop: 8, minHeight: 56 }}
              />
              <input
                placeholder="URL de l'image (optionnel)"
                value={n.imageUrl ?? ""}
                onChange={(e) => update(i, { imageUrl: e.target.value || undefined })}
                style={{ marginTop: 8 }}
              />
              <div className="grid cols-3" style={{ gap: 10, marginTop: 8 }}>
                <select
                  value={n.category ?? ""}
                  onChange={(e) => update(i, { category: (e.target.value || undefined) as typeof n.category })}
                >
                  <option value="">Catégorie…</option>
                  <option value="update">Update</option>
                  <option value="event">Event</option>
                  <option value="patch">Patch note</option>
                  <option value="shop">Boutique</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="community">Communauté</option>
                </select>
                <input
                  type="number"
                  placeholder="Temps de lecture (min)"
                  value={n.readMinutes ?? ""}
                  onChange={(e) => update(i, { readMinutes: e.target.value ? parseInt(e.target.value) : undefined })}
                />
                <label className="switch" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!n.isNew}
                    onChange={(e) => update(i, { isNew: e.target.checked || undefined })}
                  />
                  <span className="track" />
                  Badge « Nouveau »
                </label>
              </div>
              <div className="grid cols-2" style={{ gap: 10, marginTop: 8 }}>
                <input
                  placeholder="Texte du bouton (ex : Rejoindre)"
                  value={n.buttonLabel ?? ""}
                  onChange={(e) => update(i, { buttonLabel: e.target.value || undefined })}
                />
                <input
                  placeholder="Lien du bouton (optionnel)"
                  value={n.buttonUrl ?? ""}
                  onChange={(e) => update(i, { buttonUrl: e.target.value || undefined })}
                />
              </div>
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
