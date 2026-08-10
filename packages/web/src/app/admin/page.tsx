import { notFound, redirect } from "next/navigation";
import AdminConsole from "@/components/admin/AdminConsole";
import DashboardShell from "@/components/DashboardShell";
import { assetUrl } from "@/lib/asset";
import { getAdminContext } from "@/lib/admin";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : {};
}

function firstText(...values: unknown[]) {
  return values.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
}

export default async function AdminPage() {
  const context = await getAdminContext();
  if (!context) {
    const session = await getSession();
    if (session) notFound();
    redirect("/login?next=/admin");
  }

  const root = asRecord(context);
  const user = asRecord(root.user);
  const session = asRecord(root.session);
  const username =
    firstText(
      user.username,
      user.name,
      session.username,
      root.username,
      root.name,
    ) ?? "Administrateur";
  const adminId = firstText(user.id, session.userId, root.userId, root.id);
  const avatarUrl = assetUrl(
    firstText(user.avatarUrl, session.avatarUrl, root.avatarUrl),
  );

  return (
    <DashboardShell username={username} avatarUrl={avatarUrl} isAdmin>
      <AdminConsole adminName={username} adminId={adminId} />
    </DashboardShell>
  );
}
