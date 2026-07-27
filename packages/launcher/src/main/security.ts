import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import {
  canonicalJson,
  canonicalManifestPayload,
  type LauncherManifest,
} from "@jach/shared";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Normalise l'origine du site et refuse tout protocole actif/local inattendu. */
export function normalizeBaseUrl(input: string): string {
  const url = new URL(input.trim());
  const local = LOCAL_HOSTS.has(url.hostname.toLowerCase());
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new Error("Adresse refusée : HTTPS est obligatoire hors localhost.");
  }
  if (url.username || url.password) {
    throw new Error("Adresse refusée : identifiants intégrés interdits.");
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

/** URL http(s) ouvrable dans le navigateur système. */
export function safeExternalUrl(input: string): string {
  const url = new URL(input);
  const local = LOCAL_HOSTS.has(url.hostname.toLowerCase());
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new Error("Lien externe refusé.");
  }
  if (url.username || url.password) {
    throw new Error("Lien externe refusé.");
  }
  return url.toString();
}

/** Résout une cible en garantissant qu'elle reste strictement sous root. */
export function resolveInside(root: string, ...parts: string[]): string {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...parts);
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : `${resolvedRoot}${path.sep}`;
  if (target !== resolvedRoot && !target.startsWith(prefix)) {
    throw new Error(
      "Chemin de fichier refusé : sortie du dossier de l’instance.",
    );
  }
  return target;
}

/** Empreinte stable du JSON normalisé par Zod. */
export function manifestFingerprint(manifest: LauncherManifest): string {
  return crypto
    .createHash("sha256")
    .update(canonicalJson(manifest))
    .digest("hex");
}

export interface SignatureVerification {
  present: boolean;
  valid: boolean;
  signerId?: string;
}

/** Vérifie la signature sans jamais faire confiance à la clé par elle-même. */
export function verifyManifestSignature(
  manifest: LauncherManifest,
): SignatureVerification {
  if (!manifest.signature) return { present: false, valid: false };
  try {
    const publicKeyBytes = Buffer.from(manifest.signature.publicKey, "base64");
    const signatureBytes = Buffer.from(manifest.signature.value, "base64");
    const publicKey = crypto.createPublicKey({
      key: publicKeyBytes,
      format: "der",
      type: "spki",
    });
    if (
      publicKey.asymmetricKeyType !== "ed25519" ||
      signatureBytes.length !== 64
    ) {
      return { present: true, valid: false };
    }
    const valid = crypto.verify(
      null,
      Buffer.from(canonicalManifestPayload(manifest), "utf8"),
      publicKey,
      signatureBytes,
    );
    return {
      present: true,
      valid,
      signerId: valid
        ? crypto.createHash("sha256").update(publicKeyBytes).digest("hex")
        : undefined,
    };
  } catch {
    return { present: true, valid: false };
  }
}

/**
 * Refuse les destinations réseau privées après résolution DNS. localhost reste
 * autorisé uniquement pour le développement explicite du launcher.
 */
export async function assertSafeRemoteUrl(
  input: string,
  options: { allowLocalhost?: boolean } = {},
): Promise<URL> {
  const url = new URL(input);
  const hostname = url.hostname.toLowerCase();
  const local = LOCAL_HOSTS.has(hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new Error(`URL refusée : ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error("URL avec identifiants refusée.");
  }

  if (local) {
    if (options.allowLocalhost) return url;
    throw new Error("Destination locale refusée.");
  }

  const addresses = net.isIP(hostname)
    ? [{ address: hostname }]
    : await dns.lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new Error("Destination réseau privée ou non résolue refusée.");
  }
  return url;
}

export async function assertSafeServerHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (LOCAL_HOSTS.has(host)) throw new Error("Serveur local refusé.");
  const addresses = net.isIP(host)
    ? [{ address: host }]
    : await dns.lookup(host, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new Error("Adresse serveur privée ou non résolue refusée.");
  }
}

export function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (net.isIPv6(normalized)) {
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized === "2001:db8::" ||
      normalized.startsWith("2001:db8:")
    );
  }
  return true;
}
