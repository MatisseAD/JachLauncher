"use strict";

const AZURE_CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredPublicSetting(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} est requise pour construire un installateur Windows cohérent.`,
    );
  }
  return value;
}

function requiredAzureClientId() {
  const value =
    process.env.JACH_AZURE_CLIENT_ID?.trim() || process.env.JACH_ID?.trim();
  if (!value) {
    throw new Error(
      "JACH_AZURE_CLIENT_ID (ou l'alias JACH_ID) est requis explicitement pour construire un installateur. Le fallback de développement n'est jamais accepté pour une distribution.",
    );
  }
  if (!AZURE_CLIENT_ID_PATTERN.test(value)) {
    throw new Error(
      "JACH_AZURE_CLIENT_ID (ou JACH_ID) doit être un identifiant d'application Azure au format GUID.",
    );
  }
  return value;
}

requiredAzureClientId();
const updateFeedUrl = requiredPublicSetting("JACH_SIGNED_UPDATE_FEED_URL");
const publisherName = requiredPublicSetting("JACH_WINDOWS_PUBLISHER_NAME");
const parsedUpdateFeed = new URL(updateFeedUrl);

if (
  parsedUpdateFeed.protocol !== "https:" ||
  parsedUpdateFeed.username ||
  parsedUpdateFeed.password ||
  parsedUpdateFeed.search ||
  parsedUpdateFeed.hash
) {
  throw new Error(
    "JACH_SIGNED_UPDATE_FEED_URL doit être une URL HTTPS publique sans identifiants, paramètres ni fragment.",
  );
}

module.exports = {
  appId: "app.yourlauncher.desktop",
  productName: "YourLauncher",
  publish: {
    provider: "generic",
    url: updateFeedUrl.replace(/\/$/, ""),
    channel: "latest",
  },
  directories: {
    output: "release",
    buildResources: "build",
  },
  artifactName: "${productName}-Setup-${version}.${ext}",
  asar: true,
  compression: "maximum",
  files: ["out/**/*", "package.json"],
  win: {
    target: "nsis",
    icon: "build/icon.png",
    signtoolOptions: { publisherName },
    verifyUpdateCodeSignature: true,
    forceCodeSigning: process.env.CI === "true",
  },
  nsis: {
    oneClick: false,
    differentialPackage: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: "always",
    createStartMenuShortcut: true,
    installerSidebar: "build/installerSidebar.bmp",
    installerHeader: "build/installerHeader.bmp",
    shortcutName: "YourLauncher",
    uninstallDisplayName: "YourLauncher",
    language: 1036,
    runAfterFinish: true,
  },
  mac: { target: "dmg" },
  linux: { target: "AppImage" },
};
