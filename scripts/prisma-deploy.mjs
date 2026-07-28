#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const validateOnly = process.argv.includes("--validate-only");
const applicationSchema = "jach_launcher";
const timeoutMs = Number.parseInt(
  process.env.PRISMA_MIGRATION_TIMEOUT_MS ?? "120000",
  10,
);

function parsePostgresUrl(value, variableName) {
  if (!value) {
    throw new Error(`${variableName} est absente.`);
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} n'est pas une URL valide.`);
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${variableName} doit utiliser PostgreSQL.`);
  }
  return url;
}

function isSupabaseHost(hostname) {
  return (
    hostname.endsWith(".supabase.com") || hostname.endsWith(".supabase.co")
  );
}

async function main() {
  let migrationVariable;
  let migrationValue;
  if (process.env.DIRECT_URL) {
    migrationVariable = "DIRECT_URL";
    migrationValue = process.env.DIRECT_URL;
  } else if (process.env.POSTGRES_URL_NON_POOLING) {
    // Fourni automatiquement par l'intégration Supabase de Vercel.
    migrationVariable = "POSTGRES_URL_NON_POOLING";
    migrationValue = process.env.POSTGRES_URL_NON_POOLING;
  } else {
    migrationVariable = "DATABASE_URL";
    migrationValue = process.env.DATABASE_URL;
  }

  let migrationUrl = parsePostgresUrl(migrationValue, migrationVariable);
  if (
    migrationVariable === "DATABASE_URL" &&
    migrationUrl.hostname.endsWith(".pooler.supabase.com") &&
    migrationUrl.port === "6543"
  ) {
    // Chez Supabase, le même endpoint partagé utilise le port 5432 en mode
    // Session. Cela conserve la session nécessaire au verrou Prisma Migrate.
    migrationUrl = new URL(migrationUrl);
    migrationUrl.port = "5432";
    migrationUrl.searchParams.delete("pgbouncer");
    migrationUrl.searchParams.delete("connection_limit");
    migrationVariable = "DATABASE_URL dérivée en mode Session";
  }
  if (
    isSupabaseHost(migrationUrl.hostname) &&
    (!migrationUrl.searchParams.get("schema") ||
      migrationUrl.searchParams.get("schema") === "public")
  ) {
    migrationUrl.searchParams.set("schema", applicationSchema);
  }
  const port = migrationUrl.port || "5432";

  if (port === "6543") {
    throw new Error(
      [
        `${migrationVariable} utilise le pooler transactionnel sur le port 6543.`,
        "Prisma Migrate nécessite une connexion conservant la session.",
        "Configure DIRECT_URL avec la connexion directe Supabase ou le pooler Session sur le port 5432.",
      ].join(" "),
    );
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10_000) {
    throw new Error(
      "PRISMA_MIGRATION_TIMEOUT_MS doit être un entier supérieur ou égal à 10000.",
    );
  }

  console.log(
    `Migration Prisma via ${migrationVariable} → ${migrationUrl.hostname}:${port}${migrationUrl.pathname}`,
  );
  if (validateOnly) {
    console.log("Configuration de migration valide ; connexion non ouverte.");
    return;
  }

  const prismaCli = require.resolve("prisma/build/index.js");
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"],
      {
        env: {
          ...process.env,
          // Le schéma reste fondé sur DATABASE_URL pour le runtime. Seule cette
          // commande reçoit la connexion directe réservée aux migrations.
          DATABASE_URL: migrationUrl.toString(),
        },
        stdio: "inherit",
      },
    );

    const timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `Migration interrompue après ${timeoutMs / 1000} secondes. Vérifie DIRECT_URL, le mot de passe et l'état du projet Supabase.`,
        ),
      );
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          code === null
            ? `Prisma Migrate a été interrompu (${signal}).`
            : `Prisma Migrate a échoué avec le code ${code}.`,
        ),
      );
    });
  });
}

main().catch((error) => {
  console.error(`Échec de la migration : ${error.message}`);
  process.exitCode = 1;
});
