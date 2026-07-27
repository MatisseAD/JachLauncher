import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(command, ["run", "start", "--workspace=@jach/web"], {
  cwd: process.cwd(),
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
  child.kill();
}
