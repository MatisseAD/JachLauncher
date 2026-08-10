export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ADMIN_ACTIONS = [
  "ban",
  "unban",
  "promote",
  "demote",
] as const;
export type UserAdminAction = (typeof USER_ADMIN_ACTIONS)[number];

export const PLAYER_SUBJECT_TYPES = [
  "microsoft_uuid",
  "offline_username",
] as const;
export type PlayerSubjectType = (typeof PLAYER_SUBJECT_TYPES)[number];

export class InvalidPlayerIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlayerIdentityError";
  }
}

/**
 * Canonical form used by both writes and access checks. Microsoft UUIDs are
 * stored as 32 lowercase hexadecimal characters; offline names are lowercase.
 */
export function normalizePlayerIdentity(
  subjectType: PlayerSubjectType,
  rawValue: string,
): string {
  const value = rawValue.trim();
  if (subjectType === "microsoft_uuid") {
    const compact = value.replaceAll("-", "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(compact)) {
      throw new InvalidPlayerIdentityError("UUID Microsoft invalide");
    }
    return compact;
  }

  if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) {
    throw new InvalidPlayerIdentityError(
      "Le pseudo hors-ligne doit contenir 3 à 16 lettres, chiffres ou underscores",
    );
  }
  return value.toLowerCase();
}

export type UserActionDenial =
  | "SELF_ACTION"
  | "ALREADY_DISABLED"
  | "ALREADY_ACTIVE"
  | "ALREADY_ADMIN"
  | "ALREADY_USER"
  | "LAST_ACTIVE_ADMIN"
  | "LAST_ADMIN";

export interface UserActionPolicyInput {
  action: UserAdminAction;
  actorId: string;
  targetId: string;
  targetRole: UserRole;
  targetDisabled: boolean;
  activeAdminCount: number;
  adminCount: number;
}

export function isActiveAdminRecord(
  role: string,
  disabledAt: Date | string | null,
): boolean {
  return role === "admin" && disabledAt === null;
}

/** Pure policy, kept separate from Prisma so every edge case is unit tested. */
export function evaluateUserAdminAction(
  input: UserActionPolicyInput,
): { allowed: true } | { allowed: false; reason: UserActionDenial } {
  if (input.actorId === input.targetId) {
    return { allowed: false, reason: "SELF_ACTION" };
  }

  switch (input.action) {
    case "ban":
      if (input.targetDisabled) {
        return { allowed: false, reason: "ALREADY_DISABLED" };
      }
      if (input.targetRole === "admin" && input.activeAdminCount <= 1) {
        return { allowed: false, reason: "LAST_ACTIVE_ADMIN" };
      }
      return { allowed: true };
    case "unban":
      return input.targetDisabled
        ? { allowed: true }
        : { allowed: false, reason: "ALREADY_ACTIVE" };
    case "promote":
      return input.targetRole === "admin"
        ? { allowed: false, reason: "ALREADY_ADMIN" }
        : { allowed: true };
    case "demote":
      if (input.targetRole === "user") {
        return { allowed: false, reason: "ALREADY_USER" };
      }
      return input.adminCount <= 1
        ? { allowed: false, reason: "LAST_ADMIN" }
        : { allowed: true };
  }
}

/** Mutations from the browser must originate from this exact application. */
export function isSameOriginRequest(
  requestUrl: string,
  originHeader: string | null,
  configuredAppUrl?: string,
): boolean {
  if (!originHeader) return false;
  try {
    const actualOrigin = new URL(originHeader).origin;
    const expectedOrigin = configuredAppUrl
      ? new URL(configuredAppUrl).origin
      : new URL(requestUrl).origin;
    return actualOrigin === expectedOrigin;
  } catch {
    return false;
  }
}
