// Seed : crée un compte démo + des launchers d'exemple.
// Utile pour une base fraîche (local Postgres ou prod). Idempotent.
//   node prisma/seed.mjs   (ou: npm run db:seed)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("secret123", 10);
  const user = await prisma.user.upsert({
    where: { username: "demo" },
    update: {},
    create: { username: "demo", password },
  });
  console.log("Utilisateur démo : demo / secret123");

  const launchers = [
    {
      slug: "serveur-demo",
      title: "Serveur Demo",
      description: "Un launcher d'exemple Fabric.",
      status: "published",
      primaryColor: "#8b5cf6",
      secondaryColor: "#c4b5fd",
      mcVersion: "1.20.1",
      loader: "fabric",
      launcherType: "survival",
      mods: JSON.stringify([
        { id: "sodium", name: "Sodium", fileName: "sodium-fabric-0.5.8.jar", url: "https://cdn.modrinth.com/data/AANobbMI/versions/sodium-fabric-0.5.8.jar", source: "modrinth", required: true },
      ]),
      news: JSON.stringify([
        { id: "n1", title: "Bienvenue !", description: "Le serveur est ouvert.", date: "2026-06-18", category: "community", isNew: true },
      ]),
    },
    {
      slug: "rp-kingdom",
      title: "RP Kingdom",
      description: "Serveur Roleplay médiéval.",
      status: "published",
      primaryColor: "#9d4edd",
      secondaryColor: "#c9a227",
      ambiance: "rain",
      visualStyle: "medieval",
      mcVersion: "1.20.1",
      loader: "fabric",
      launcherType: "rp",
      serverAddress: "play.rpkingdom.fr",
      serverPort: 25565,
      showDiscord: true,
      discordUrl: "https://discord.gg/example",
      supportUrl: "https://discord.gg/example",
      news: JSON.stringify([
        { id: "n1", title: "Saison médiévale", description: "Un nouveau royaume vous attend.", date: "2026-06-18", category: "event", isNew: true, readMinutes: 2 },
      ]),
      events: JSON.stringify([
        { id: "e1", title: "Event Donjon", description: "Donjon hardcore en équipe.", startsAt: "2026-07-01T20:00", rewards: "Épée légendaire", buttonLabel: "Participer", buttonUrl: "https://rpkingdom.fr" },
      ]),
      patchNotes: JSON.stringify([
        { id: "p1", version: "2.3.0", date: "2026-06-15", lines: ["+ Nouveau donjon", "+ Métier forgeron", "- Corrections de bugs"] },
      ]),
      alert: JSON.stringify({ active: true, kind: "info", message: "Nouvelle saison disponible !" }),
    },
  ];

  for (const l of launchers) {
    await prisma.launcher.upsert({
      where: { slug: l.slug },
      update: { ...l, ownerId: user.id },
      create: { ...l, ownerId: user.id },
    });
    console.log("Launcher :", l.slug);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
