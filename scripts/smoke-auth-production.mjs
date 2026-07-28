#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = path.resolve("packages/web/.env.vercel");
  if (!existsSync(envPath)) return undefined;

  const databaseLine = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((line) => /^\s*DATABASE_URL\s*=/.test(line));
  if (!databaseLine) return undefined;

  let value = databaseLine.slice(databaseLine.indexOf("=") + 1).trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }

  return value || undefined;
}

function normalizeDatabaseUrl(configured) {
  if (!configured) throw new Error("DATABASE_URL absente.");
  const url = new URL(configured);
  const isSupabase =
    url.hostname.endsWith(".supabase.com") ||
    url.hostname.endsWith(".supabase.co");
  if (isSupabase) {
    if (
      !url.searchParams.get("schema") ||
      url.searchParams.get("schema") === "public"
    ) {
      url.searchParams.set("schema", "jach_launcher");
    }
    if (url.port === "6543") {
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("connection_limit", "1");
    }
  }
  return url.toString();
}

async function responseBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 500);
  }
}

async function expectOk(response, step) {
  if (!response.ok) {
    throw new Error(
      `${step} a retourné HTTP ${response.status}: ${JSON.stringify(await responseBody(response))}`,
    );
  }
}

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie?.includes("jach_session=")) {
    throw new Error("Le cookie de session jach_session est absent.");
  }
  return setCookie.split(";", 1)[0];
}

async function main() {
  const appUrl = new URL(process.argv[2] ?? "");
  if (appUrl.protocol !== "https:") {
    throw new Error("Une URL HTTPS de production est requise.");
  }
  const origin = appUrl.origin;
  const username = `codex_smoke_${Date.now().toString(36)}`;
  const password = randomBytes(24).toString("base64url");
  const prisma = new PrismaClient({
    datasources: {
      db: { url: normalizeDatabaseUrl(readDatabaseUrl()) },
    },
  });
  let created = false;

  try {
    const register = await fetch(`${origin}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      redirect: "manual",
    });
    await expectOk(register, "L'inscription");
    created = true;
    const registerCookie = sessionCookie(register);

    const firstDashboard = await fetch(`${origin}/dashboard`, {
      headers: { Cookie: registerCookie },
      redirect: "manual",
    });
    await expectOk(firstDashboard, "La session après inscription");

    const rejectedLogin = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: `${password}-incorrect` }),
    });
    if (rejectedLogin.status !== 401) {
      throw new Error(
        `Un mot de passe incorrect doit retourner 401, reçu ${rejectedLogin.status}.`,
      );
    }

    const login = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      redirect: "manual",
    });
    await expectOk(login, "La connexion");
    const loginCookie = sessionCookie(login);

    const secondDashboard = await fetch(`${origin}/dashboard`, {
      headers: { Cookie: loginCookie },
      redirect: "manual",
    });
    await expectOk(secondDashboard, "La session après connexion");

    console.log(
      "Smoke auth réussi : inscription, refus du mauvais mot de passe, connexion et sessions.",
    );
  } finally {
    try {
      if (created) {
        await prisma.user.deleteMany({ where: { username } });
        console.log("Compte de test supprimé.");
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch((error) => {
  console.error(`Smoke auth échoué : ${error.message}`);
  process.exitCode = 1;
});
