import { SafeSlugSchema } from "@jach/shared";
import { z } from "zod";
import type { Account } from "../shared-types/ipc";
import { readResponseTextBounded } from "./bounded-response";
import { assertSafeRemoteUrl, normalizeBaseUrl } from "./security";

const MAX_RESPONSE_BYTES = 16 * 1024;
const ACCESS_TIMEOUT_MS = 10_000;

const AccessAccountSchema = z
  .object({
    type: z.enum(["microsoft", "offline"]),
    uuid: z
      .string()
      .trim()
      .regex(
        /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
        "UUID Minecraft invalide",
      ),
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_]{3,16}$/),
  })
  .strict();

const AccessDecisionSchema = z
  .object({
    allowed: z.boolean(),
    message: z.string().trim().min(1).max(500).optional(),
    code: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_:-]{1,64}$/)
      .optional(),
  })
  .strict();

export interface LauncherAccessDecision {
  allowed: boolean;
  message?: string;
  code?: string;
  /** Vrai lorsque le serveur n'a pas pu rendre une décision fiable. */
  unavailable?: boolean;
}

export class LauncherAccessPolicyError extends Error {
  readonly code: string;
  readonly unavailable: boolean;

  constructor(decision: LauncherAccessDecision) {
    super(decision.message ?? "L'accès à ce launcher a été refusé.");
    this.name = "LauncherAccessPolicyError";
    this.code = decision.code ?? "ACCESS_DENIED";
    this.unavailable = decision.unavailable === true;
  }
}

type FetchLike = typeof fetch;

function unavailable(message: string): LauncherAccessDecision {
  return {
    allowed: false,
    unavailable: true,
    code: "ACCESS_CHECK_UNAVAILABLE",
    message,
  };
}

/**
 * Demande au site si ce compte peut lancer cette instance.
 *
 * Cette vérification est volontairement fail-closed : une panne, une redirection
 * ou une réponse ambiguë ne doit pas contourner une fermeture administrative.
 */
export async function checkLauncherAccess(
  baseUrl: string,
  slug: string,
  account: Account,
  fetchImpl: FetchLike = fetch,
): Promise<LauncherAccessDecision> {
  const parsedSlug = SafeSlugSchema.safeParse(slug.trim());
  // Account contient aussi des données d'affichage (avatarUrl). Le contrat
  // réseau est construit explicitement pour ne transmettre que ces 3 champs.
  const parsedAccount = AccessAccountSchema.safeParse({
    type: account.type,
    uuid: account.uuid,
    username: account.username,
  });
  if (!parsedSlug.success || !parsedAccount.success) {
    return unavailable(
      "Le launcher ou le compte local est invalide. Recharge le launcher puis reconnecte-toi.",
    );
  }

  try {
    const origin = normalizeBaseUrl(baseUrl);
    const endpoint = `${origin}/api/launcher-access/${encodeURIComponent(parsedSlug.data)}`;
    await assertSafeRemoteUrl(endpoint, { allowLocalhost: true });

    const response = await fetchImpl(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-YourLauncher-Client": "desktop",
      },
      body: JSON.stringify(parsedAccount.data),
      signal: AbortSignal.timeout(ACCESS_TIMEOUT_MS),
    });

    const text = await readResponseTextBounded(response, MAX_RESPONSE_BYTES);

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return unavailable(
        "Le serveur n'a pas renvoyé une décision d'accès valide.",
      );
    }
    const parsedDecision = AccessDecisionSchema.safeParse(json);
    if (!parsedDecision.success) {
      return unavailable(
        "Le serveur n'a pas renvoyé une décision d'accès valide.",
      );
    }

    const decision = parsedDecision.data;
    if (!decision.allowed) {
      const temporarilyUnavailable =
        response.status === 429 ||
        response.status >= 500 ||
        decision.code === "ACCESS_CHECK_UNAVAILABLE" ||
        decision.code === "RATE_LIMITED";
      return {
        allowed: false,
        unavailable: temporarilyUnavailable || undefined,
        code: decision.code ?? "ACCESS_DENIED",
        message:
          decision.message ??
          (temporarilyUnavailable
            ? "Le contrôle d'accès est temporairement indisponible. Réessaie dans quelques instants."
            : "L'administrateur a suspendu l'accès à ce launcher pour ce compte."),
      };
    }
    if (!response.ok) {
      return unavailable(
        `Le contrôle d'accès a échoué (HTTP ${response.status}). Réessaie dans quelques instants.`,
      );
    }
    return { allowed: true, code: decision.code, message: decision.message };
  } catch {
    return unavailable(
      "Impossible de vérifier l'autorisation auprès du serveur. Vérifie ta connexion puis réessaie.",
    );
  }
}
