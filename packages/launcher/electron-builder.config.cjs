"use strict";

function requiredPublicSetting(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} est requise pour construire un installateur Windows cohérent.`,
    );
  }
  return value;
}

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
