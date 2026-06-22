// Bascule le schéma Prisma de SQLite (défaut local) vers PostgreSQL.
// Exécuté UNIQUEMENT pendant le build Vercel (checkout éphémère) : le dépôt
// reste en SQLite pour le développement local.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(root, "..", "packages", "web", "prisma", "schema.prisma");

let schema = readFileSync(schemaPath, "utf8");

// 1) provider sqlite -> postgresql
schema = schema.replace(
  /provider\s*=\s*"sqlite"/,
  'provider = "postgresql"',
);

// 2) Ajoute les binaryTargets pour le runtime Linux de Vercel si absent.
if (!schema.includes("binaryTargets")) {
  schema = schema.replace(
    /generator\s+client\s*\{/,
    'generator client {\n  binaryTargets = ["native", "rhel-openssl-3.0.x"]',
  );
}

writeFileSync(schemaPath, schema, "utf8");
console.log("[use-postgres] schema.prisma -> PostgreSQL (build Vercel)");
