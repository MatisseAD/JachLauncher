import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const AZURE_CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bundledAzureClientId(): string {
  const clientId = process.env.JACH_AZURE_CLIENT_ID?.trim() ?? "";
  if (clientId && !AZURE_CLIENT_ID_PATTERN.test(clientId)) {
    throw new Error(
      "JACH_AZURE_CLIENT_ID doit être un identifiant d’application Azure au format GUID.",
    );
  }
  return clientId;
}

export default defineConfig({
  main: {
    // Les dépendances Node/XMCL restent externes ; @jach/shared est bundlé afin
    // d'éviter un require() CommonJS vers son build ESM.
    plugins: [externalizeDepsPlugin({ exclude: ["@jach/shared"] })],
    define: {
      // Identifiant public OAuth (jamais un secret). JSON.stringify empêche
      // qu'une valeur d'environnement soit interprétée comme du code.
      __JACH_AZURE_CLIENT_ID__: JSON.stringify(bundledAzureClientId()),
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/main/index.ts") },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/preload/index.ts") },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "src/renderer/index.html") },
      },
    },
    plugins: [react()],
  },
});
