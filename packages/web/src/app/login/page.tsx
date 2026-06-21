"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDict } from "@/i18n/I18nProvider";

export default function LoginPage() {
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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t.auth.errLogin);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t.auth.loginTitle}</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>{t.auth.usernameLabel}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>{t.auth.passwordLabel}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn" disabled={loading} style={{ width: "100%" }}>
            {loading ? t.auth.loggingIn : t.auth.login}
          </button>
          {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>
          {t.auth.noAccount} <Link href="/register">{t.auth.createOne}</Link>
        </p>
      </div>
    </div>
  );
}
