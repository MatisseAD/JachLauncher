#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createPrivateKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Sur certaines versions récentes de Node.js pour Windows, child_process.spawn
 * refuse directement les wrappers npm.cmd/npx.cmd avec EINVAL. On exécute le
 * point d'entrée JavaScript de npm avec le binaire Node courant : aucun shell
 * intermédiaire et donc aucun problème d'échappement des arguments.
 */
function resolveNpmRunner() {
  const candidates = [
    process.env.npm_execpath,
    path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ].filter(Boolean);
  const npmCliPath = candidates.find((candidate) => existsSync(candidate));
  if (npmCliPath) {
    return { command: process.execPath, prefix: [npmCliPath] };
  }
  if (process.platform === "win32") {
    throw new Error(
      "Impossible de localiser npm-cli.js. Lance ce script avec `npm run deploy:vercel`.",
    );
  }
  return { command: "npm", prefix: [] };
}

const npmRunner = resolveNpmRunner();

const requiredEnvironmentVariables = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
];
const optionalEnvironmentVariables = [
  "MANIFEST_SIGNING_PRIVATE_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "NEXT_PUBLIC_ADSENSE_CLIENT",
];
const sensitiveEnvironmentVariables = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "MANIFEST_SIGNING_PRIVATE_KEY",
  "BLOB_READ_WRITE_TOKEN",
]);

function printUsage() {
  console.log(`
Déploie YourLauncher sur Vercel depuis la racine du monorepo.

Usage :
  npm run deploy:vercel -- --env-file packages/web/.env.vercel

Options :
  --prod                 Déploiement de production (valeur par défaut)
  --preview              Déploiement Preview
  --env-file <fichier>   Synchronise les variables de ce fichier vers Vercel
  --project <nom|id>     Projet Vercel, sans créer de liaison locale
  --scope <équipe>       Compte ou équipe Vercel
  --skip-checks          Ignore npm run check et l'audit de production
  --validate-only        Valide la configuration sans contacter Vercel
  --help                 Affiche cette aide

Authentification :
  - connexion interactive avec la CLI Vercel ; ou
  - variables VERCEL_TOKEN, VERCEL_ORG_ID et VERCEL_PROJECT_ID en CI.

Sans --env-file, les variables doivent déjà exister dans l'environnement
Vercel ciblé. Les secrets ne sont jamais affichés par ce script.
`);
}

function readOptionValue(argumentsList, index, option) {
  const value = argumentsList[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`La valeur de ${option} est manquante.`);
  }
  return value;
}

function parseArguments(argumentsList) {
  const options = {
    production: true,
    envFile: undefined,
    project: undefined,
    scope: undefined,
    skipChecks: false,
    validateOnly: false,
    help: false,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    switch (argument) {
      case "--prod":
        options.production = true;
        break;
      case "--preview":
        options.production = false;
        break;
      case "--env-file":
        options.envFile = readOptionValue(argumentsList, index, argument);
        index += 1;
        break;
      case "--project":
        options.project = readOptionValue(argumentsList, index, argument);
        index += 1;
        break;
      case "--scope":
        options.scope = readOptionValue(argumentsList, index, argument);
        index += 1;
        break;
      case "--skip-checks":
        options.skipChecks = true;
        break;
      case "--validate-only":
        options.validateOnly = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Option inconnue : ${argument}`);
    }
  }

  return options;
}

function parseEnvironmentFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Fichier d'environnement introuvable : ${filePath}`);
  }

  const values = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/u.exec(line);
    if (!match) {
      throw new Error(`Ligne .env invalide : ${rawLine}`);
    }

    let value = match[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value
          .replaceAll("\\n", "\n")
          .replaceAll("\\r", "\r")
          .replaceAll('\\"', '"')
          .replaceAll("\\\\", "\\");
      }
    } else {
      value = value.replace(/\s+#.*$/u, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function validateEnvironment(values, requireValues) {
  if (requireValues) {
    const missing = requiredEnvironmentVariables.filter(
      (name) => !values[name]?.trim(),
    );
    if (missing.length > 0) {
      throw new Error(
        `Variables requises absentes du fichier ou du processus : ${missing.join(", ")}`,
      );
    }
  }

  const databaseUrls = [
    ["DATABASE_URL", values.DATABASE_URL],
    ["DIRECT_URL", values.DIRECT_URL],
  ];
  for (const [name, value] of databaseUrls) {
    if (!value) continue;
    let databaseUrl;
    try {
      databaseUrl = new URL(value);
    } catch {
      throw new Error(`${name} n'est pas une URL valide.`);
    }
    if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
      throw new Error(`${name} doit utiliser PostgreSQL.`);
    }
    if (
      ["localhost", "127.0.0.1", "::1"].includes(
        databaseUrl.hostname.toLowerCase(),
      )
    ) {
      throw new Error(
        `${name} pointe vers cette machine et sera inaccessible depuis Vercel.`,
      );
    }
  }

  if (values.DIRECT_URL) {
    const directUrl = new URL(values.DIRECT_URL);
    if ((directUrl.port || "5432") === "6543") {
      throw new Error(
        "DIRECT_URL doit utiliser la connexion directe ou le pooler Session Supabase sur le port 5432, jamais le pooler transactionnel 6543.",
      );
    }
  }

  if (values.DATABASE_URL) {
    const runtimeUrl = new URL(values.DATABASE_URL);
    if (
      runtimeUrl.hostname.endsWith(".pooler.supabase.com") &&
      runtimeUrl.port === "6543" &&
      runtimeUrl.searchParams.get("pgbouncer") !== "true"
    ) {
      throw new Error(
        "Ajoute pgbouncer=true aux paramètres de DATABASE_URL pour le pooler transactionnel Supabase.",
      );
    }
  }

  if (values.AUTH_SECRET && values.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET doit contenir au moins 32 caractères.");
  }

  if (values.NEXT_PUBLIC_APP_URL) {
    let appUrl;
    try {
      appUrl = new URL(values.NEXT_PUBLIC_APP_URL);
    } catch {
      throw new Error("NEXT_PUBLIC_APP_URL n'est pas une URL valide.");
    }
    if (appUrl.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_APP_URL doit utiliser HTTPS sur Vercel.");
    }
    if (
      appUrl.pathname !== "/" ||
      appUrl.search ||
      appUrl.hash ||
      values.NEXT_PUBLIC_APP_URL.endsWith("/")
    ) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL doit être une origine sans chemin ni slash final.",
      );
    }
  }

  if (values.MANIFEST_SIGNING_PRIVATE_KEY) {
    try {
      const privateKey = createPrivateKey({
        key: Buffer.from(values.MANIFEST_SIGNING_PRIVATE_KEY, "base64"),
        format: "der",
        type: "pkcs8",
      });
      if (privateKey.asymmetricKeyType !== "ed25519") {
        throw new Error("type incorrect");
      }
    } catch {
      throw new Error(
        "MANIFEST_SIGNING_PRIVATE_KEY doit être une clé privée Ed25519 PKCS8 encodée en base64.",
      );
    }
  }
}

function execute(command, argumentsList, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: rootDirectory,
      env: process.env,
      stdio: [
        options.input === undefined ? "inherit" : "pipe",
        options.capture ? "pipe" : "inherit",
        "inherit",
      ],
    });

    let stdout = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }
    if (options.input !== undefined) {
      child.stdin.end(`${options.input}\n`);
    }

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(
        new Error(
          `${command} a échoué${code === null ? ` (${signal})` : ` avec le code ${code}`}.`,
        ),
      );
    });
  });
}

function createVercelRunner(options) {
  const globalArguments = ["--no-color"];
  if (options.scope) globalArguments.push("--scope", options.scope);
  if (options.project) globalArguments.push("--project", options.project);
  if (process.env.VERCEL_TOKEN) {
    globalArguments.push("--token", process.env.VERCEL_TOKEN);
  }

  return (argumentsList, executionOptions) =>
    execute(
      npmRunner.command,
      [
        ...npmRunner.prefix,
        "exec",
        "--yes",
        "--package=vercel@latest",
        "--",
        "vercel",
        ...argumentsList,
        ...globalArguments,
      ],
      executionOptions,
    );
}

function executeNpm(argumentsList, options) {
  return execute(
    npmRunner.command,
    [...npmRunner.prefix, ...argumentsList],
    options,
  );
}

async function ensureProjectIsLinked(options, runVercel) {
  const hasEnvironmentProject =
    Boolean(process.env.VERCEL_PROJECT_ID) &&
    Boolean(process.env.VERCEL_ORG_ID);
  const isLinked = existsSync(
    path.join(rootDirectory, ".vercel", "project.json"),
  );
  if (isLinked || options.project || hasEnvironmentProject) return;

  console.log(
    "\nAucun projet Vercel lié. Sélectionne ou crée le projet dans l'assistant :",
  );
  await runVercel(["link"]);
}

async function synchronizeEnvironment(values, target, runVercel) {
  const names = [
    ...requiredEnvironmentVariables,
    ...optionalEnvironmentVariables,
  ].filter((name) => values[name]);

  console.log(
    `\nSynchronisation de ${names.length} variable(s) vers ${target}…`,
  );
  for (const name of names) {
    const argumentsList = ["env", "add", name, target, "--force"];
    if (sensitiveEnvironmentVariables.has(name)) {
      argumentsList.push("--sensitive");
    }
    await runVercel(argumentsList, { input: values[name] });
    console.log(`  ✓ ${name}`);
  }
}

async function assertRemoteEnvironment(target, runVercel) {
  console.log(`\nContrôle des variables Vercel de ${target}…`);
  const output = await runVercel(["env", "ls", target], { capture: true });
  const missing = requiredEnvironmentVariables.filter(
    (name) => !new RegExp(`(^|\\s)${name}(\\s|$)`, "mu").test(output),
  );
  if (missing.length > 0) {
    throw new Error(
      [
        `Variables Vercel absentes pour ${target} : ${missing.join(", ")}`,
        "Crée packages/web/.env.vercel puis relance avec :",
        "npm run deploy:vercel -- --env-file packages/web/.env.vercel",
      ].join("\n"),
    );
  }
  console.log("  ✓ variables requises présentes");
}

async function verifyDeployment(deploymentUrl) {
  console.log(`\nVérification HTTP de ${deploymentUrl}…`);
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(deploymentUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      const body = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!body.includes("YourLauncher")) {
        throw new Error("marqueur YourLauncher absent");
      }
      const csp = response.headers.get("content-security-policy");
      if (!csp?.includes("default-src")) {
        throw new Error("en-tête Content-Security-Policy absent");
      }
      console.log("  ✓ accueil accessible et en-têtes de sécurité présents");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 12) {
        await new Promise((resolve) => setTimeout(resolve, 2_500));
      }
    }
  }
  throw new Error(`Le smoke test HTTP a échoué : ${String(lastError)}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  if (!existsSync(path.join(rootDirectory, "vercel.json"))) {
    throw new Error("vercel.json est introuvable à la racine du monorepo.");
  }
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (nodeMajor < 20) {
    throw new Error("Node.js 20 ou supérieur est requis.");
  }

  const target = options.production ? "production" : "preview";
  const values = { ...process.env };
  if (options.envFile) {
    const envFilePath = path.resolve(rootDirectory, options.envFile);
    Object.assign(values, parseEnvironmentFile(envFilePath));
  }
  if (options.envFile || options.validateOnly) {
    validateEnvironment(values, true);
  }

  console.log(`Déploiement Vercel ${target} de YourLauncher`);
  if (!options.skipChecks) {
    console.log("\nContrôles locaux…");
    await executeNpm(["run", "check"]);
    await executeNpm(["audit", "--omit=dev"]);
  } else {
    console.warn("\n⚠ Contrôles locaux ignorés à la demande de l'utilisateur.");
  }

  if (options.validateOnly) {
    console.log(
      "\n✓ Configuration locale valide ; aucun appel à Vercel effectué.",
    );
    return;
  }

  const runVercel = createVercelRunner(options);
  await ensureProjectIsLinked(options, runVercel);

  if (options.envFile) {
    await synchronizeEnvironment(values, target, runVercel);
  } else {
    await assertRemoteEnvironment(target, runVercel);
  }

  if (!values.MANIFEST_SIGNING_PRIVATE_KEY) {
    console.warn(
      "⚠ Impossible de confirmer la signature Ed25519 sans --env-file ; vérifie sa présence sur Vercel.",
    );
  }
  if (!values.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "⚠ Impossible de confirmer Vercel Blob sans --env-file ; les uploads persistants le nécessitent.",
    );
  }

  console.log(`\nConstruction, migrations Prisma et déploiement ${target}…`);
  const deployArguments = ["deploy", "--yes"];
  if (options.production) deployArguments.push("--prod");
  const deployOutput = await runVercel(deployArguments, { capture: true });
  const deploymentUrls = deployOutput.match(/https:\/\/[^\s]+/gu);
  const deploymentUrl = deploymentUrls?.at(-1)?.replace(/[),.;]+$/u, "");
  if (!deploymentUrl) {
    throw new Error(
      `La CLI Vercel n'a pas retourné d'URL de déploiement : ${deployOutput}`,
    );
  }

  await verifyDeployment(deploymentUrl);
  console.log(`\n✓ Déploiement terminé : ${deploymentUrl}`);
  if (values.NEXT_PUBLIC_APP_URL) {
    console.log(`  Origine canonique : ${values.NEXT_PUBLIC_APP_URL}`);
  }
}

main().catch((error) => {
  console.error(`\nÉchec du déploiement : ${error.message}`);
  process.exitCode = 1;
});
