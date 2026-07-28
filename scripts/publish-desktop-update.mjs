#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { put } from "@vercel/blob";

const root = path.resolve(import.meta.dirname, "..");
const releaseDir = path.resolve(root, "packages/launcher/release");
const envFileArg = process.argv.indexOf("--env-file");

if (envFileArg >= 0 && process.argv[envFileArg + 1]) {
  const envPath = path.resolve(root, process.argv[envFileArg + 1]);
  const text = await readFile(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error(
    "BLOB_READ_WRITE_TOKEN est requis pour publier une mise à jour.",
  );
}

const files = await readdir(releaseDir);
const launcherPackage = JSON.parse(
  await readFile(path.join(root, "packages/launcher/package.json"), "utf8"),
);
const installerName = `YourLauncher-Setup-${launcherPackage.version}.exe`;
if (!files.includes(installerName)) {
  throw new Error("Installateur YourLauncher introuvable dans release/.");
}

const blockmapName = `${installerName}.blockmap`;
if (!files.includes(blockmapName) || !files.includes("latest.yml")) {
  throw new Error(
    "latest.yml ou le blockmap manque. Exécute d’abord le packaging Windows.",
  );
}

const publish = async (
  pathname,
  sourceName,
  contentType,
  cacheControlMaxAge,
  multipart = false,
) =>
  put(pathname, await readFile(path.join(releaseDir, sourceName)), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge,
    multipart,
  });

// Les artefacts immuables sont envoyés avant le manifeste. Ainsi, un client ne
// voit jamais un latest.yml dont le binaire n'est pas encore disponible.
const installer = await publish(
  `releases/windows/${installerName}`,
  installerName,
  "application/vnd.microsoft.portable-executable",
  31_536_000,
  true,
);
await publish(
  `releases/windows/${blockmapName}`,
  blockmapName,
  "application/octet-stream",
  31_536_000,
);
const latestInstaller = await publish(
  "releases/YourLauncher-Setup-latest.exe",
  installerName,
  "application/vnd.microsoft.portable-executable",
  60,
  true,
);
const metadata = await publish(
  "releases/windows/latest.yml",
  "latest.yml",
  "text/yaml; charset=utf-8",
  60,
);

console.log(`Canal de mise à jour publié : ${metadata.url}`);
console.log(`Installateur versionné : ${installer.url}`);
console.log(`Lien stable du site : ${latestInstaller.url}`);
