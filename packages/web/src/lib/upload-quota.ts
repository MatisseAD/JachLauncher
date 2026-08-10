import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const MAX_USER_UPLOAD_BYTES_PER_DAY = 64 * 1024 * 1024;
export const MAX_USER_UPLOADS_PER_DAY = 30;

export type UploadUsage = { bytes: number; uploads: number };

export function canConsumeUploadQuota(
  usage: UploadUsage,
  bytes: number,
): boolean {
  return (
    Number.isSafeInteger(bytes) &&
    bytes > 0 &&
    usage.bytes <= MAX_USER_UPLOAD_BYTES_PER_DAY - bytes &&
    usage.uploads < MAX_USER_UPLOADS_PER_DAY
  );
}

export function uploadQuotaDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Réserve atomiquement une part du quota journalier. `updateMany` porte les
 * bornes dans la requête SQL afin que deux instances ne puissent pas dépasser
 * la limite par une course lecture/écriture.
 */
export async function consumeUserUploadQuota(
  userId: string,
  bytes: number,
): Promise<boolean> {
  if (!canConsumeUploadQuota({ bytes: 0, uploads: 0 }, bytes)) return false;

  const day = uploadQuotaDay();
  const whereWithinQuota = {
    userId,
    day,
    bytes: { lte: MAX_USER_UPLOAD_BYTES_PER_DAY - bytes },
    uploads: { lt: MAX_USER_UPLOADS_PER_DAY },
  } as const;
  const increment = {
    bytes: { increment: bytes },
    uploads: { increment: 1 },
  } as const;

  const updated = await prisma.userUploadUsage.updateMany({
    where: whereWithinQuota,
    data: increment,
  });
  if (updated.count === 1) return true;

  const existing = await prisma.userUploadUsage.findUnique({
    where: { userId_day: { userId, day } },
    select: { userId: true },
  });
  if (existing) return false;

  try {
    await prisma.userUploadUsage.create({
      data: { userId, day, bytes, uploads: 1 },
    });
    return true;
  } catch (error) {
    // Une autre instance a pu créer la ligne entre findUnique et create.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.userUploadUsage.updateMany({
        where: whereWithinQuota,
        data: increment,
      });
      return raced.count === 1;
    }
    throw error;
  }
}
