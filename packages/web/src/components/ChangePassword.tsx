"use client";

import { useState } from "react";

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Erreur");
        return;
      }
      setMsg("Mot de passe mis à jour ✓");
      setCurrent("");
      setNext("");
    } catch {
      setError("Connexion impossible. Réessaie dans quelques instants.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="current-password">Mot de passe actuel</label>
        <input
          id="current-password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      <div className="field">
        <label htmlFor="new-password">Nouveau mot de passe</label>
        <input
          id="new-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          placeholder="6 caractères minimum"
        />
        <div className="hint">Minimum 6 caractères.</div>
      </div>
      <button className="btn security-submit" disabled={busy}>
        {busy ? "Mise à jour…" : "Mettre à jour"}
      </button>
      {msg && (
        <div className="success" style={{ marginTop: 10 }}>
          {msg}
        </div>
      )}
      {error && (
        <div className="error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </form>
  );
}
