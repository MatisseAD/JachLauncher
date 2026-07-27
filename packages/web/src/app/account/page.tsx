import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChangePassword from "@/components/ChangePassword";
import LogoutButton from "@/components/LogoutButton";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const count = await prisma.launcher.count({
    where: { ownerId: session.userId },
  });
  const published = await prisma.launcher.count({
    where: { ownerId: session.userId, status: "published" },
  });

  return (
    <>
      <Navbar />
      <div className="container narrow">
        <h2>Mon compte</h2>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="row spread">
            <div className="row" style={{ gap: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#04140b",
                  background: "var(--brand-grad)",
                }}
              >
                {session.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>
                  {session.username}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {count} launcher(s) · {published} publié(s)
                </div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sécurité</h3>
          <ChangePassword />
        </div>
      </div>
    </>
  );
}
