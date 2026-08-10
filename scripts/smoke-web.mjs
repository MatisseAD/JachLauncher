import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

const host = "127.0.0.1";

async function getAvailablePort() {
  const server = createServer();
  server.unref();
  server.listen(0, host);
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Impossible de sélectionner un port pour le smoke test.");
  }

  const { port } = address;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

const port = await getAvailablePort();
const baseUrl = `http://${host}:${port}`;

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
    PORT: String(port),
    NEXT_PUBLIC_APP_URL: baseUrl,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let spawnError;
child.on("error", (error) => {
  spawnError = error;
  output += `${error.stack ?? error.message}\n`;
});
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

async function waitFor(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `Le serveur web s'est arrêté avant de répondre (${child.exitCode ?? child.signalCode}).\n${output}`,
      );
    }
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

async function waitForChildExit(timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

async function stopServerTree() {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForChildExit(5_000);
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }

  await waitForChildExit(5_000);
  if (child.exitCode === null && child.signalCode === null) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
    await waitForChildExit(2_000);
  }
}

try {
  const homepage = await waitFor(`${baseUrl}/`);
  if (!(await homepage.text()).includes("YourLauncher")) {
    throw new Error("La page d'accueil ne contient pas le produit attendu.");
  }
  const manifest = await waitFor(`${baseUrl}/api/manifest/serveur-demo`);
  const json = await manifest.json();
  if (json.schemaVersion !== 2 || json.id !== "serveur-demo") {
    throw new Error("Le manifeste de démonstration est invalide.");
  }
  if (process.env.MANIFEST_SIGNING_PRIVATE_KEY && !json.signature?.value) {
    throw new Error("Le manifeste attendu signé ne contient pas de signature.");
  }
  console.log("Smoke web réussi : accueil et manifeste v2 disponibles.");
} finally {
  await stopServerTree();
}
