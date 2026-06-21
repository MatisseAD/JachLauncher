"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ label = "Déconnexion" }: { label?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button className="btn secondary sm" onClick={logout}>
      {label}
    </button>
  );
}
