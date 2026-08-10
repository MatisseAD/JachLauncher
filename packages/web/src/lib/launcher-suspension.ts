export function isLauncherSuspended(
  suspendedAt: Date | string | null | undefined,
): boolean {
  return suspendedAt !== null && suspendedAt !== undefined;
}

export const SUSPENDED_LAUNCHER_OWNER_ERROR = {
  error:
    "Ce launcher est suspendu par l'administration et ne peut pas être modifié.",
  code: "LAUNCHER_SUSPENDED",
} as const;
