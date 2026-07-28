"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDict } from "@/i18n/I18nProvider";
import LogoMark from "@/components/LogoMark";
import UiIcon from "@/components/UiIcon";

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
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t.auth.errLogin);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t.auth.errLogin);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <Link href="/" className="brand auth-brand">
          <LogoMark />
        </Link>
        <div className="auth-aside-copy">
          <span className="page-kicker">Espace créateur</span>
          <h1>Retrouve tous tes launchers au même endroit.</h1>
          <p>
            Modifie une version, publie une actualité et suis l’activité de tes
            joueurs depuis ton dashboard.
          </p>
          <div className="auth-benefits">
            <span>
              <UiIcon name="activity" size={18} />
              Métriques d’utilisation sur 7 jours
            </span>
            <span>
              <UiIcon name="shield" size={18} />
              Session sécurisée
            </span>
            <span>
              <UiIcon name="sparkles" size={18} />
              Prévisualisation instantanée
            </span>
          </div>
        </div>
        <p className="auth-aside-note">YourLauncher · Créé pour Minecraft</p>
      </section>

      <section className="auth-main">
        <Link href="/" className="auth-back">
          ← Retour au site
        </Link>
        <div className="auth-card">
          <span className="auth-icon">
            <UiIcon name="user" size={24} />
          </span>
          <h2>{t.auth.loginTitle}</h2>
          <p className="auth-subtitle">
            Entre tes identifiants pour accéder à ton espace.
          </p>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="username">{t.auth.usernameLabel}</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Ton nom d’utilisateur"
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t.auth.passwordLabel}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button className="btn auth-submit" disabled={loading}>
              {loading ? t.auth.loggingIn : t.auth.login}
              {!loading && <UiIcon name="arrow" size={17} />}
            </button>
            {error && (
              <div className="form-alert error" role="alert">
                {error}
              </div>
            )}
          </form>
          <p className="auth-switch">
            {t.auth.noAccount} <Link href="/register">{t.auth.createOne}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
