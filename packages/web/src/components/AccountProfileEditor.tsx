"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UiIcon from "./UiIcon";
import { useI18n } from "@/i18n/I18nProvider";
import { getAccountCopy } from "@/i18n/account-content";
import { assetUrl } from "@/lib/asset";

export default function AccountProfileEditor({
  username: initialUsername,
  email: initialEmail,
  avatarUrl: initialAvatarUrl,
}: {
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = getAccountCopy(locale).editor;
  const picker = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, currentPassword }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(json.error ?? "Modification impossible.");
        return;
      }
      setCurrentPassword("");
      setMessage(copy.profileSaved);
      router.refresh();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    setAvatarBusy(true);
    setMessage("");
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: form,
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        avatarUrl?: string;
      };
      if (!response.ok || !json.avatarUrl) {
        setError(json.error ?? "Envoi impossible.");
        return;
      }
      setAvatarUrl(assetUrl(json.avatarUrl) ?? "");
      setMessage(copy.avatarSaved);
      router.refresh();
    } catch {
      setError(copy.uploadFailed);
    } finally {
      setAvatarBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }

  return (
    <div className="profile-editor">
      <div className="avatar-editor">
        <div className="profile-avatar is-image">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            username.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <strong>{copy.photo}</strong>
          <span>{copy.photoHint}</span>
          <button
            type="button"
            className="btn ghost sm"
            disabled={avatarBusy}
            onClick={() => picker.current?.click()}
          >
            <UiIcon name="layers" size={15} />
            {avatarBusy ? copy.sending : copy.choose}
          </button>
          <input
            ref={picker}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void uploadAvatar(event.target.files?.[0])}
          />
        </div>
      </div>

      <form onSubmit={save} className="profile-form">
        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="profile-username">{copy.username}</label>
            <input
              id="profile-username"
              value={username}
              minLength={3}
              maxLength={32}
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">{copy.email}</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              maxLength={254}
              autoComplete="email"
              placeholder="toi@exemple.fr"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="profile-password">{copy.confirm}</label>
          <input
            id="profile-password"
            type="password"
            value={currentPassword}
            autoComplete="current-password"
            placeholder="••••••••"
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <div className="hint">{copy.confirmHint}</div>
        </div>
        <button className="btn" disabled={busy || !currentPassword}>
          {busy ? copy.saving : copy.save}
        </button>
      </form>

      {message && <div className="form-alert success">{message}</div>}
      {error && <div className="form-alert error">{error}</div>}
    </div>
  );
}
