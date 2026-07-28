"use client";

import { useRouter } from "next/navigation";
import UiIcon from "./UiIcon";

export default function LogoutButton({
  label = "Déconnexion",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      className={compact ? "logout-compact" : "btn secondary sm"}
      onClick={logout}
      aria-label={label}
      title={label}
    >
      {compact ? <UiIcon name="external" size={17} /> : label}
    </button>
  );
}
