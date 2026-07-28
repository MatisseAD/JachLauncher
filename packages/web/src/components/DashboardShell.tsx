"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LogoMark from "./LogoMark";
import LogoutButton from "./LogoutButton";
import UiIcon, { type UiIconName } from "./UiIcon";

const navigation: Array<{
  href: string;
  label: string;
  mobileLabel: string;
  icon: UiIconName;
  exact?: boolean;
}> = [
  {
    href: "/dashboard",
    label: "Vue d’ensemble",
    mobileLabel: "Accueil",
    icon: "dashboard",
    exact: true,
  },
  {
    href: "/dashboard/new",
    label: "Nouveau launcher",
    mobileLabel: "Nouveau",
    icon: "plus",
  },
  {
    href: "/help",
    label: "Guide d’utilisation",
    mobileLabel: "Guide",
    icon: "help",
  },
  {
    href: "/account",
    label: "Mon compte",
    mobileLabel: "Compte",
    icon: "user",
  },
];

export default function DashboardShell({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-brand" aria-label="YourLauncher">
          <LogoMark />
        </Link>

        <div className="sidebar-label">Espace créateur</div>
        <nav className="sidebar-nav" aria-label="Navigation du dashboard">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${
                isActive(item.href, item.exact) ? "active" : ""
              }`}
            >
              <UiIcon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-support">
          <span className="sidebar-support-icon">
            <UiIcon name="sparkles" size={18} />
          </span>
          <strong>Besoin d’aide ?</strong>
          <p>Le guide explique chaque étape, du code serveur au partage.</p>
          <Link href="/help">
            Ouvrir le guide <UiIcon name="arrow" size={14} />
          </Link>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-copy">
            <strong>{username}</strong>
            <span>Compte créateur</span>
          </div>
          <LogoutButton compact />
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <Link href="/" className="dashboard-mobile-brand">
            <LogoMark text={false} />
            <span>YourLauncher</span>
          </Link>
          <div className="topbar-status">
            <span className="status-pulse" />
            Services opérationnels
          </div>
          <Link href="/" className="topbar-link">
            Voir le site <UiIcon name="external" size={15} />
          </Link>
        </header>
        <div className="dashboard-content">{children}</div>
      </main>

      <nav className="dashboard-mobile-nav" aria-label="Navigation mobile">
        {navigation.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href, item.exact) ? "active" : ""}
          >
            <UiIcon name={item.icon} size={19} />
            <span>{item.mobileLabel}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
