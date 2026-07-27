import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import WizardEditor from "@/components/WizardEditor";
import { getSession } from "@/lib/auth";

export default async function NewLauncherPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <Navbar />
      <div className="container">
        <h2 style={{ marginTop: 0 }}>Nouveau launcher</h2>
        <p className="muted" style={{ marginTop: -8, marginBottom: 22 }}>
          Je choisis, je personnalise, je prévisualise, je génère.
        </p>
        <WizardEditor mode="create" />
      </div>
    </>
  );
}
