import { describe, expect, it } from "vitest";
import {
  MANIFEST_SCHEMA_VERSION,
  safeParseManifest,
  type LauncherManifest,
} from "./manifest";

function validManifest(): LauncherManifest {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    id: "serveur-test",
    updatedAt: "2026-07-27T12:00:00.000Z",
    launcherType: "modded",
    preLaunchMessage: "",
    branding: {
      title: "Serveur test",
      description: "",
      primaryColor: "#5b8cff",
      secondaryColor: "#00d18f",
      textColor: "#e6edf3",
      theme: "dark",
      visualStyle: "premium",
      buttonStyle: "glow",
      cardShape: "rounded",
      menuPlacement: "left",
      showNews: true,
      showDiscord: false,
      showWebsite: false,
      ambiance: "none",
    },
    minecraft: { version: "1.21.1", loader: "fabric" },
    server: {},
    memory: { min: 1024, max: 4096 },
    mods: [
      {
        id: "sodium",
        name: "Sodium",
        fileName: "sodium.jar",
        url: "https://cdn.example.com/sodium.jar",
        sha256: "a".repeat(64),
        size: 42,
        source: "direct",
        required: true,
      },
    ],
    resourcepacks: [],
    shaderpacks: [],
    news: [],
    events: [],
    patchNotes: [],
    maintenance: { active: false },
    alert: { active: false, kind: "info", message: "" },
    jvmArgs: ["-XX:+UseG1GC"],
  };
}

describe("LauncherManifestSchema", () => {
  it("accepte et normalise un manifeste v2 sûr", () => {
    const parsed = safeParseManifest(validManifest());
    expect(parsed.success).toBe(true);
  });

  it.each(["../evil.jar", "folder/evil.jar", "C:\\evil.jar"])(
    "refuse le nom de fichier %s",
    (fileName) => {
      const manifest = validManifest();
      manifest.mods[0].fileName = fileName;
      expect(safeParseManifest(manifest).success).toBe(false);
    },
  );

  it("refuse HTTP hors localhost et les hash incomplets", () => {
    const manifest = validManifest();
    manifest.mods[0].url = "http://example.com/mod.jar";
    manifest.mods[0].sha256 = "abc";
    expect(safeParseManifest(manifest).success).toBe(false);
  });

  it("refuse une mémoire incohérente", () => {
    const manifest = validManifest();
    manifest.memory = { min: 8192, max: 4096 };
    expect(safeParseManifest(manifest).success).toBe(false);
  });

  it("autorise le même nom dans deux dossiers mais pas deux fois dans un dossier", () => {
    const manifest = validManifest();
    manifest.resourcepacks = [{ ...manifest.mods[0], id: "pack" }];
    expect(safeParseManifest(manifest).success).toBe(true);
    manifest.mods.push({ ...manifest.mods[0], id: "duplicate" });
    expect(safeParseManifest(manifest).success).toBe(false);
  });
});
