import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const npmCli = [
  process.env.npm_execpath,
  path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  ),
].find((candidate) => candidate && existsSync(candidate));
const command = npmCli ? process.execPath : "npm";
const commandArguments = [
  ...(npmCli ? [npmCli] : []),
  "run",
  "start",
  "--workspace=@jach/web",
];
const child = spawn(command, commandArguments, {
  cwd: process.cwd(),
  detached: process.platform !== "win32",
  env: {
    ...process.env,
    AUTH_SECRET:
      process.env.AUTH_SECRET ??
      "smoke-test-secret-at-least-thirty-two-characters",
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

async function waitFor(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Le serveur n'écoute pas encore.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Délai dépassé pour ${url}\n${output}`);
}

function stopServerTree() {
  if (!child.pid || child.exitCode !== null) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

try {
  const homepage = await waitFor("http://localhost:3000/");
  if (!(await homepage.text()).includes("YourLauncher")) {
    throw new Error("La page d'accueil ne contient pas le produit attendu.");
  }
  const manifest = await waitFor(
    "http://localhost:3000/api/manifest/serveur-demo",
  );
  const json = await manifest.json();
  if (json.schemaVersion !== 2 || json.id !== "serveur-demo") {
    throw new Error("Le manifeste de démonstration est invalide.");
  }
  if (process.env.MANIFEST_SIGNING_PRIVATE_KEY && !json.signature?.value) {
    throw new Error("Le manifeste attendu signé ne contient pas de signature.");
  }
  console.log("Smoke web réussi : accueil et manifeste v2 disponibles.");
} finally {
  stopServerTree();
}
