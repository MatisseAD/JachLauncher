"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { getAccountCopy } from "@/i18n/account-content";

export default function ChangePassword() {
  const { locale } = useI18n();
  const copy = getAccountCopy(locale).password;
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
      setMsg(copy.success);
      setCurrent("");
      setNext("");
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="current-password">{copy.current}</label>
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
        <label htmlFor="new-password">{copy.next}</label>
        <input
          id="new-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          placeholder={copy.hint}
        />
        <div className="hint">{copy.hint}</div>
      </div>
      <button className="btn security-submit" disabled={busy}>
        {busy ? copy.updating : copy.update}
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
