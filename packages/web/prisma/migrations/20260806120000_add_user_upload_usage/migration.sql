-- Quota journalier global par utilisateur, commun aux avatars, logos et fonds.
CREATE TABLE "UserUploadUsage" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "uploads" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUploadUsage_pkey" PRIMARY KEY ("userId", "day")
);

ALTER TABLE "UserUploadUsage"
ADD CONSTRAINT "UserUploadUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Défense en profondeur si le schéma Prisma est exposé à la Data API Supabase.
ALTER TABLE "UserUploadUsage" ENABLE ROW LEVEL SECURITY;
