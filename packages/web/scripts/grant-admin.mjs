import console from "node:console";
import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { normalizeAdminDatabaseUrl } from "./admin-database-url.mjs";

const username = process.argv[2]?.trim();
if (!username || username.length > 32) {
  console.error("Usage : npm run admin:grant -- <username>");
  process.exit(2);
}

let prisma;

try {
  prisma = new PrismaClient({
    datasources: {
      db: { url: normalizeAdminDatabaseUrl(process.env.DATABASE_URL) },
    },
  });
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT "id" FROM "User"
      WHERE "username" = ${username}
      FOR UPDATE
    `;
    const user = await tx.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true, disabledAt: true },
    });
    if (!user) throw new Error(`Compte introuvable : ${username}`);
    if (user.disabledAt) {
      throw new Error(
        "Le compte est suspendu ; réactive-le avant de lui accorder le rôle admin.",
      );
    }
    if (user.role === "admin")
      return { changed: false, username: user.username };

    await tx.user.update({ where: { id: user.id }, data: { role: "admin" } });
    await tx.adminAuditLog.create({
      data: {
        // Une commande CLI n'est pas une action authentifiée du compte promu.
        actorId: null,
        action: "admin.bootstrap",
        targetType: "user",
        targetId: user.id,
        metadata: {
          username: user.username,
          promotedUserId: user.id,
          source: "admin:grant",
        },
      },
    });
    return { changed: true, username: user.username };
  });

  console.log(
    result.changed
      ? `Rôle administrateur accordé à ${result.username}.`
      : `${result.username} est déjà administrateur.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
