"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LogoMark from "./LogoMark";
import LogoutButton from "./LogoutButton";
import UiIcon, { type UiIconName } from "./UiIcon";
import { useI18n } from "@/i18n/I18nProvider";
import { getDashboardCopy } from "@/i18n/dashboard-content";

export default function DashboardShell({
  username,
  avatarUrl,
  children,
}: {
  username: string;
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const copy = getDashboardCopy(locale).shell;
  const navigation: Array<{
    href: string;
    label: string;
    mobileLabel: string;
    icon: UiIconName;
    exact?: boolean;
  }> = [
    {
      href: "/dashboard",
      label: copy.overview,
      mobileLabel: copy.home,
      icon: "dashboard",
      exact: true,
    },
    {
      href: "/dashboard/new",
      label: copy.newLauncher,
      mobileLabel: copy.newShort,
      icon: "plus",
    },
    {
      href: "/help",
      label: copy.guide,
      mobileLabel: copy.guide,
      icon: "help",
    },
    {
      href: "/account",
      label: copy.account,
      mobileLabel: copy.account,
      icon: "user",
    },
  ];

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-brand" aria-label="YourLauncher">
          <LogoMark />
        </Link>

        <div className="sidebar-label">{copy.creatorArea}</div>
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
          <strong>{copy.supportTitle}</strong>
          <p>{copy.supportText}</p>
          <Link href="/help">
            {copy.openGuide} <UiIcon name="arrow" size={14} />
          </Link>
        </div>

        <div className="sidebar-user">
          <div className="avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="sidebar-user-copy">
            <strong>{username}</strong>
            <span>{copy.creatorAccount}</span>
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
            {copy.operational}
          </div>
          <Link href="/" className="topbar-link">
            {copy.viewSite} <UiIcon name="external" size={15} />
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
