#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { list, put } from "@vercel/blob";
import { load as parseYaml } from "js-yaml";

const root = path.resolve(import.meta.dirname, "..");
const releaseDir = path.resolve(root, "packages/launcher/release");
const envFileArg = process.argv.indexOf("--env-file");
const validateOnly = process.argv.includes("--validate-only");
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const LEGACY_UPDATE_ROOT =
  "https://5v6eph0amoamojpm.public.blob.vercel-storage.com/releases/windows";
const UPDATE_PATH_PREFIX = "releases/windows";
const bootstrapLegacy = process.argv.includes("--bootstrap-legacy");
const execFileAsync = promisify(execFile);

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

function normalizeUpdateRoot(input, label) {
  if (!input?.trim()) {
    throw new Error(`${label} est absente.`);
  }
  const url = new URL(input.trim());
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${label} doit être une URL HTTPS publique sans paramètres.`,
    );
  }
  return url.toString().replace(/\/+$/, "");
}

function parseBlobStoreId(token, label) {
  const parts = token.split("_");
  const storeId = parts[3]?.trim();
  if (
    parts[0] !== "vercel" ||
    parts[1] !== "blob" ||
    parts[2] !== "rw" ||
    !storeId ||
    !/^[a-z0-9-]+$/i.test(storeId) ||
    parts.length < 5
  ) {
    throw new Error(`${label} n'est pas un jeton Vercel Blob RW valide.`);
  }
  return storeId;
}

async function preflightBlobStore(token, updateRoot, label) {
  const storeId = parseBlobStoreId(token, label);
  const expectedRoot = `https://${storeId}.public.blob.vercel-storage.com/${UPDATE_PATH_PREFIX}`;
  if (updateRoot !== expectedRoot) {
    throw new Error(
      `${label} cible le store ${storeId}, mais le client lit ${updateRoot}.`,
    );
  }

  try {
    await list({ token, prefix: `${UPDATE_PATH_PREFIX}/`, limit: 1 });
  } catch {
    throw new Error(
      `${label} ne permet pas d'accéder au Blob store configuré. Aucune publication n'a été tentée.`,
    );
  }

  return `https://${storeId}.public.blob.vercel-storage.com`;
}

function expectedBlobUrl(blobOrigin, pathname) {
  return new URL(`/${pathname}`, `${blobOrigin}/`).toString();
}

const configuredSignedRoot = process.env.JACH_SIGNED_UPDATE_FEED_URL?.trim();
if (!configuredSignedRoot) {
  throw new Error(
    "JACH_SIGNED_UPDATE_FEED_URL est requise, y compris pour une validation locale ou un bootstrap historique.",
  );
}
const SIGNED_UPDATE_ROOT = normalizeUpdateRoot(
  configuredSignedRoot,
  "JACH_SIGNED_UPDATE_FEED_URL",
);
const signedUrl = new URL(SIGNED_UPDATE_ROOT);
const legacyUrl = new URL(LEGACY_UPDATE_ROOT);
if (signedUrl.hostname === legacyUrl.hostname) {
  throw new Error(
    "JACH_SIGNED_UPDATE_FEED_URL doit cibler un nouveau Blob store distinct du canal historique.",
  );
}
const UPDATE_ROOT = bootstrapLegacy ? LEGACY_UPDATE_ROOT : SIGNED_UPDATE_ROOT;

function yamlScalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  if (!match) return null;
  const value = match[1].replace(/\s+#.*$/, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function sha512Base64(buffer) {
  return createHash("sha512").update(buffer).digest("base64");
}

function compareSemver(left, right) {
  const a = SEMVER_PATTERN.exec(left);
  const b = SEMVER_PATTERN.exec(right);
  if (!a || !b) throw new Error("Comparaison de versions SemVer impossible.");
  for (let index = 1; index <= 3; index += 1) {
    const difference = Number(a[index]) - Number(b[index]);
    if (difference) return Math.sign(difference);
  }
  const aPre = a[4]?.split(".");
  const bPre = b[4]?.split(".");
  if (!aPre && !bPre) return 0;
  if (!aPre) return 1;
  if (!bPre) return -1;
  for (let index = 0; index < Math.max(aPre.length, bPre.length); index += 1) {
    if (aPre[index] === undefined) return -1;
    if (bPre[index] === undefined) return 1;
    if (aPre[index] === bPre[index]) continue;
    const aNumeric = /^\d+$/.test(aPre[index]);
    const bNumeric = /^\d+$/.test(bPre[index]);
    if (aNumeric && bNumeric) {
      return Math.sign(Number(aPre[index]) - Number(bPre[index]));
    }
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return aPre[index].localeCompare(bPre[index]);
  }
  return 0;
}

async function verifyAuthenticodeSignature(installerPath) {
  if (process.platform !== "win32") {
    throw new Error(
      "La publication doit être exécutée sous Windows afin de vérifier la signature Authenticode de l’installateur.",
    );
  }
  const command = [
    "$signature = Get-AuthenticodeSignature -LiteralPath $env:JACH_INSTALLER_PATH",
    'if ($signature.Status -ne "Valid") {',
    '  throw "Signature Authenticode invalide : $($signature.Status)"',
    "}",
    "$publisher = $signature.SignerCertificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)",
    'if ([string]::IsNullOrWhiteSpace($publisher)) { throw "Éditeur Authenticode absent" }',
    "Write-Output $publisher",
  ].join("\n");
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
      {
        env: { ...process.env, JACH_INSTALLER_PATH: installerPath },
        windowsHide: true,
      },
    );
    const publisher = stdout.trim();
    if (!publisher || publisher.includes("\n") || publisher.includes("\r")) {
      throw new Error("Éditeur Authenticode ambigu.");
    }
    return publisher;
  } catch {
    throw new Error(
      "Publication refusée : l’installateur Windows ne possède pas une signature Authenticode valide.",
    );
  }
}

const files = await readdir(releaseDir);
const launcherPackage = JSON.parse(
  await readFile(path.join(root, "packages/launcher/package.json"), "utf8"),
);
if (
  bootstrapLegacy &&
  process.env.JACH_LEGACY_BOOTSTRAP_VERSION?.trim() !== launcherPackage.version
) {
  throw new Error(
    "Le bootstrap du canal historique est limité à JACH_LEGACY_BOOTSTRAP_VERSION.",
  );
}
if (!SEMVER_PATTERN.test(launcherPackage.version)) {
  throw new Error(`Version Electron non SemVer : ${launcherPackage.version}`);
}
if (!validateOnly) {
  const releaseTag = (
    process.env.GITHUB_REF_NAME ?? process.env.JACH_RELEASE_TAG
  )?.trim();
  const expectedTag = `v${launcherPackage.version}`;
  if (releaseTag !== expectedTag) {
    throw new Error(
      `Publication refusée : le tag doit être exactement ${expectedTag} (GITHUB_REF_NAME ou JACH_RELEASE_TAG).`,
    );
  }
}

const installerName = `YourLauncher-Setup-${launcherPackage.version}.exe`;
const blockmapName = `${installerName}.blockmap`;
for (const required of [installerName, blockmapName, "latest.yml"]) {
  if (!files.includes(required)) {
    throw new Error(
      `${required} manque dans release/. Exécute d'abord le packaging Windows.`,
    );
  }
}

const installerBytes = await readFile(path.join(releaseDir, installerName));
const blockmapBytes = await readFile(path.join(releaseDir, blockmapName));
const metadataBytes = await readFile(path.join(releaseDir, "latest.yml"));
const appUpdatePath = path.join(
  releaseDir,
  "win-unpacked",
  "resources",
  "app-update.yml",
);
const appUpdateText = await readFile(appUpdatePath, "utf8").catch(() => {
  throw new Error(
    "win-unpacked/resources/app-update.yml manque. Recrée le package Windows avant validation.",
  );
});
const metadataText = metadataBytes.toString("utf8");
if (!installerBytes.length || !blockmapBytes.length || !metadataBytes.length) {
  throw new Error("Un artefact de mise à jour est vide.");
}

const metadataVersion = yamlScalar(metadataText, "version");
const metadataPath = yamlScalar(metadataText, "path");
const metadataSha512 = yamlScalar(metadataText, "sha512");
const listedUrls = [...metadataText.matchAll(/^\s*-\s+url:\s*(.+?)\s*$/gm)].map(
  (match) => match[1].replace(/^['"]|['"]$/g, ""),
);
const listedSizes = [...metadataText.matchAll(/^\s+size:\s*(\d+)\s*$/gm)].map(
  (match) => Number(match[1]),
);
const expectedSha512 = sha512Base64(installerBytes);

if (metadataVersion !== launcherPackage.version) {
  throw new Error(
    `latest.yml annonce ${metadataVersion ?? "aucune version"}, attendu ${launcherPackage.version}.`,
  );
}
if (
  metadataPath !== installerName ||
  listedUrls.length !== 1 ||
  listedUrls[0] !== installerName
) {
  throw new Error(
    `latest.yml doit référencer uniquement l'installateur relatif ${installerName}.`,
  );
}
if (listedUrls.some((url) => url.includes("..") || /^https?:/i.test(url))) {
  throw new Error("latest.yml contient une URL d'artefact non relative.");
}
if (
  metadataSha512 !== expectedSha512 ||
  !metadataText.includes(expectedSha512)
) {
  throw new Error(
    "Le SHA-512 de latest.yml ne correspond pas à l'installateur.",
  );
}
if (!listedSizes.includes(installerBytes.length)) {
  throw new Error(
    "La taille de l'installateur dans latest.yml est incorrecte.",
  );
}

const appUpdateConfig = parseYaml(appUpdateText);
if (!appUpdateConfig || typeof appUpdateConfig !== "object") {
  throw new Error("app-update.yml est invalide.");
}
const appUpdatePublishers = (
  Array.isArray(appUpdateConfig.publisherName)
    ? appUpdateConfig.publisherName
    : [appUpdateConfig.publisherName]
)
  .filter((publisher) => typeof publisher === "string")
  .map((publisher) => publisher.trim())
  .filter(Boolean);
if (appUpdatePublishers.length === 0) {
  throw new Error(
    "app-update.yml doit épingler au moins un publisherName Authenticode.",
  );
}
if (
  appUpdateConfig.provider !== "generic" ||
  appUpdateConfig.channel !== "latest" ||
  normalizeUpdateRoot(appUpdateConfig.url, "L'URL d'app-update.yml") !==
    SIGNED_UPDATE_ROOT
) {
  throw new Error(
    `app-update.yml doit cibler exactement le canal signé ${SIGNED_UPDATE_ROOT}.`,
  );
}

if (validateOnly) {
  console.log(
    `Structure des artefacts ${launcherPackage.version} valide. La signature Authenticode et l'accès au Blob store ne sont contrôlés que lors d'une publication réelle.`,
  );
  process.exit(0);
}

const authenticodePublisher = await verifyAuthenticodeSignature(
  path.join(releaseDir, installerName),
);
if (!appUpdatePublishers.includes(authenticodePublisher)) {
  throw new Error(
    `L'éditeur Authenticode « ${authenticodePublisher} » ne correspond pas au publisherName épinglé dans app-update.yml.`,
  );
}

const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (!blobToken) {
  throw new Error(
    "BLOB_READ_WRITE_TOKEN est requis pour publier une mise à jour.",
  );
}
const blobOrigin = await preflightBlobStore(
  blobToken,
  UPDATE_ROOT,
  bootstrapLegacy
    ? "LEGACY_BLOB_READ_WRITE_TOKEN"
    : "SIGNED_BLOB_READ_WRITE_TOKEN",
);

const publishedMetadataResponse = await fetch(
  `${UPDATE_ROOT}/latest.yml?preflight=${Date.now()}`,
  { cache: "no-store" },
);
if (publishedMetadataResponse.ok) {
  const publishedVersion = yamlScalar(
    await publishedMetadataResponse.text(),
    "version",
  );
  if (!publishedVersion || !SEMVER_PATTERN.test(publishedVersion)) {
    throw new Error("Le latest.yml public contient une version invalide.");
  }
  if (compareSemver(launcherPackage.version, publishedVersion) < 0) {
    throw new Error(
      `Publication refusée : ${launcherPackage.version} est antérieure au canal public ${publishedVersion}.`,
    );
  }
} else if (publishedMetadataResponse.status !== 404) {
  throw new Error(
    `Impossible de lire le latest.yml public (HTTP ${publishedMetadataResponse.status}).`,
  );
}

const publish = async (
  pathname,
  bytes,
  contentType,
  cacheControlMaxAge,
  multipart = false,
  allowOverwrite = false,
) => {
  const result = await put(pathname, bytes, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite,
    contentType,
    cacheControlMaxAge,
    multipart,
    token: blobToken,
  });
  const expectedUrl = expectedBlobUrl(blobOrigin, pathname);
  if (new URL(result.url).toString() !== expectedUrl) {
    throw new Error(
      `Vercel Blob a retourné une URL inattendue pour ${pathname}. La publication est interrompue avant tout pointeur mutable.`,
    );
  }
  return result;
};

async function immutableArtifactAlreadyPublished(url, expectedBytes) {
  const response = await fetch(`${url}?preflight=${Date.now()}`, {
    cache: "no-store",
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(
      `Impossible d'inspecter l'artefact ${url} (HTTP ${response.status}).`,
    );
  }

  const publishedBytes = Buffer.from(await response.arrayBuffer());
  if (
    publishedBytes.length !== expectedBytes.length ||
    sha512Base64(publishedBytes) !== sha512Base64(expectedBytes)
  ) {
    throw new Error(
      `Conflit de version ${launcherPackage.version} : ${url} existe avec un contenu différent. Incrémente la version au lieu d'écraser l'artefact publié.`,
    );
  }
  console.log(`Artefact immuable identique réutilisé : ${url}`);
  return true;
}

async function requirePublicBytesMatch(url, expectedBytes, label) {
  const response = await fetch(`${url}?bootstrap-check=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `${label} doit déjà exister sur le canal signé (HTTP ${response.status}) avant le bootstrap historique.`,
    );
  }
  const remoteBytes = Buffer.from(await response.arrayBuffer());
  if (
    remoteBytes.length !== expectedBytes.length ||
    sha512Base64(remoteBytes) !== sha512Base64(expectedBytes)
  ) {
    throw new Error(
      `${label} diffère entre le build local et le canal signé. Le canal historique reste inchangé.`,
    );
  }
}

if (bootstrapLegacy) {
  // Le vieux parc ne reçoit le binaire de transition qu'après preuve que ce
  // même binaire est déjà disponible sur son nouveau canal signé définitif.
  await Promise.all([
    requirePublicBytesMatch(
      `${SIGNED_UPDATE_ROOT}/latest.yml`,
      metadataBytes,
      "latest.yml",
    ),
    requirePublicBytesMatch(
      `${SIGNED_UPDATE_ROOT}/${installerName}`,
      installerBytes,
      installerName,
    ),
    requirePublicBytesMatch(
      `${SIGNED_UPDATE_ROOT}/${blockmapName}`,
      blockmapBytes,
      blockmapName,
    ),
  ]);
}

async function verifyPublicFile(url, expectedSize) {
  const response = await fetch(`${url}?verify=${Date.now()}`, {
    method: "HEAD",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Artefact publié inaccessible (HTTP ${response.status}) : ${url}`,
    );
  }
  const contentLength = response.headers.get("content-length")?.trim();
  if (!contentLength || !/^\d+$/.test(contentLength)) {
    throw new Error(`Taille distante absente ou invalide pour ${url}.`);
  }
  const size = Number(contentLength);
  if (!Number.isSafeInteger(size) || size !== expectedSize) {
    throw new Error(`Taille distante incorrecte pour ${url}.`);
  }
}

// Les artefacts sont publiés avant latest.yml : un client ne peut jamais voir
// un manifeste dont l'installateur ou le blockmap n'est pas encore disponible.
const [installerAlreadyPublished, blockmapAlreadyPublished] = await Promise.all(
  [
    immutableArtifactAlreadyPublished(
      `${UPDATE_ROOT}/${installerName}`,
      installerBytes,
    ),
    immutableArtifactAlreadyPublished(
      `${UPDATE_ROOT}/${blockmapName}`,
      blockmapBytes,
    ),
  ],
);
const installer = installerAlreadyPublished
  ? { url: `${UPDATE_ROOT}/${installerName}` }
  : await publish(
      `releases/windows/${installerName}`,
      installerBytes,
      "application/vnd.microsoft.portable-executable",
      31_536_000,
      true,
      false,
    );
const blockmap = blockmapAlreadyPublished
  ? { url: `${UPDATE_ROOT}/${blockmapName}` }
  : await publish(
      `releases/windows/${blockmapName}`,
      blockmapBytes,
      "application/octet-stream",
      31_536_000,
      false,
      false,
    );
await Promise.all([
  verifyPublicFile(installer.url, installerBytes.length),
  verifyPublicFile(blockmap.url, blockmapBytes.length),
]);

const latestInstaller = await publish(
  "releases/YourLauncher-Setup-latest.exe",
  installerBytes,
  "application/vnd.microsoft.portable-executable",
  60,
  true,
  true,
);
const metadata = await publish(
  "releases/windows/latest.yml",
  metadataBytes,
  "text/yaml; charset=utf-8",
  60,
  false,
  true,
);

if (new URL(metadata.url).toString() !== `${UPDATE_ROOT}/latest.yml`) {
  throw new Error(
    `Le manifeste a été publié sur ${metadata.url}, mais le client lit ${UPDATE_ROOT}/latest.yml.`,
  );
}
await Promise.all([
  verifyPublicFile(metadata.url, metadataBytes.length),
  verifyPublicFile(latestInstaller.url, installerBytes.length),
]);

// Une lecture GET avec cache-buster confirme aussi le contenu du pointeur
// mutable, pas seulement son existence.
const publicMetadata = await fetch(`${metadata.url}?verify=${Date.now()}`, {
  cache: "no-store",
});
if (!publicMetadata.ok) {
  throw new Error(
    `latest.yml public inaccessible (HTTP ${publicMetadata.status}).`,
  );
}
const publicMetadataBytes = Buffer.from(await publicMetadata.arrayBuffer());
if (
  createHash("sha256").update(publicMetadataBytes).digest("hex") !==
  createHash("sha256").update(metadataBytes).digest("hex")
) {
  throw new Error("Le latest.yml public ne correspond pas au fichier généré.");
}

console.log(`Canal de mise à jour publié et vérifié : ${metadata.url}`);
console.log(`Installateur versionné : ${installer.url}`);
console.log(`Blockmap différentiel : ${blockmap.url}`);
console.log(`Lien stable du site : ${latestInstaller.url}`);
