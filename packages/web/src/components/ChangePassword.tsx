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
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Erreur");
      return;
    }
    setMsg("Mot de passe mis à jour ✓");
    setCurrent("");
    setNext("");
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>Mot de passe actuel</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="field">
        <label>Nouveau mot de passe</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <div className="hint">Minimum 6 caractères.</div>
      </div>
      <button className="btn" disabled={busy}>
        {busy ? "…" : "Mettre à jour"}
      </button>
      {msg && <div className="success" style={{ marginTop: 10 }}>{msg}</div>}
      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </form>
  );
}
