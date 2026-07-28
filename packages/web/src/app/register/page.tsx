"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { getAuthCopy } from "@/i18n/auth-content";
import LogoMark from "@/components/LogoMark";
import UiIcon from "@/components/UiIcon";

export default function RegisterPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const copy = getAuthCopy(locale);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t.auth.errRegister);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t.auth.errRegister);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-aside register">
        <Link href="/" className="brand auth-brand">
          <LogoMark />
        </Link>
        <div className="auth-aside-copy">
          <span className="page-kicker">{copy.free}</span>
          <h1>{copy.registerHero}</h1>
          <p>{copy.registerIntro}</p>
          <div className="auth-quote">
            <UiIcon name="rocket" size={22} />
            <div>
              <strong>{copy.promise}</strong>
              <span>{copy.promiseText}</span>
            </div>
          </div>
        </div>
        <p className="auth-aside-note">YourLauncher · {copy.madeFor}</p>
      </section>

      <section className="auth-main">
        <Link href="/" className="auth-back">
          ← {copy.back}
        </Link>
        <div className="auth-card">
          <span className="auth-icon">
            <UiIcon name="sparkles" size={24} />
          </span>
          <h2>{t.auth.registerTitle}</h2>
          <p className="auth-subtitle">{copy.registerSubtitle}</p>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="username">{t.auth.usernameLabel}</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder={copy.usernamePlaceholder}
                autoFocus
              />
              <div className="hint">{t.auth.usernameHint}</div>
            </div>
            <div className="field">
              <label htmlFor="email">
                {copy.email} ({copy.optional})
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="toi@exemple.fr"
              />
              <div className="hint">{copy.emailHint}</div>
            </div>
            <div className="field">
              <label htmlFor="password">{t.auth.passwordLabel}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="6 caractères minimum"
              />
              <div className="hint">{t.auth.passwordHint}</div>
            </div>
            <button className="btn auth-submit" disabled={loading}>
              {loading ? t.auth.creating : t.auth.register}
              {!loading && <UiIcon name="arrow" size={17} />}
            </button>
            {error && (
              <div className="form-alert error" role="alert">
                {error}
              </div>
            )}
          </form>
          <p className="auth-switch">
            {t.auth.haveAccount} <Link href="/login">{t.auth.signIn}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
