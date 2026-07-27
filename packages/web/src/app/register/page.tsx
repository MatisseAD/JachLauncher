"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDict } from "@/i18n/I18nProvider";

export default function RegisterPage() {
  const router = useRouter();
  const t = useDict();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t.auth.errRegister);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t.auth.registerTitle}</h2>
        <span className="badge published" style={{ marginBottom: 16 }}>
          <span className="dot" />
          {t.footer.freeNote}
        </span>
        <form onSubmit={submit}>
          <div className="field">
            <label>{t.auth.usernameLabel}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <div className="hint">{t.auth.usernameHint}</div>
          </div>
          <div className="field">
            <label>{t.auth.passwordLabel}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="hint">{t.auth.passwordHint}</div>
          </div>
          <button className="btn" disabled={loading} style={{ width: "100%" }}>
            {loading ? t.auth.creating : t.auth.register}
          </button>
          {error && (
            <div className="error" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>
          {t.auth.haveAccount} <Link href="/login">{t.auth.signIn}</Link>
        </p>
      </div>
    </div>
  );
}
