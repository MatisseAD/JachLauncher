import { z } from "zod";
import {
  normalizePlayerIdentity,
  type PlayerSubjectType,
} from "./admin-policy";

const MinecraftUsername = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,16}$/);
const MicrosoftUuid = z
  .string()
  .trim()
  .regex(
    /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );

export const LauncherAccessAccountSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("microsoft"),
      uuid: MicrosoftUuid,
      username: MinecraftUsername,
    })
    .strict(),
  z
    .object({
      type: z.literal("offline"),
      // Account always contains a UUID, but it is locally generated in offline
      // mode and must never participate in an authorization decision.
      uuid: z.string().min(1).max(64),
      username: MinecraftUsername,
    })
    .strict(),
]);

export type LauncherAccessAccount = z.infer<typeof LauncherAccessAccountSchema>;

export function launcherAccessIdentity(account: LauncherAccessAccount): {
  subjectType: PlayerSubjectType;
  subjectValue: string;
} {
  const subjectType: PlayerSubjectType =
    account.type === "microsoft" ? "microsoft_uuid" : "offline_username";
  return {
    subjectType,
    subjectValue: normalizePlayerIdentity(
      subjectType,
      account.type === "microsoft" ? account.uuid : account.username,
    ),
  };
}
