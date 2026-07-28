-- CreateTable
CREATE TABLE "LauncherDailyMetric" (
    "id" TEXT NOT NULL,
    "launcherId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "manifestLoads" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LauncherDailyMetric_pkey" PRIMARY KEY ("id")
);

-- The unique index supports the atomic daily upsert and the dashboard range query.
CREATE UNIQUE INDEX "LauncherDailyMetric_launcherId_day_key"
ON "LauncherDailyMetric"("launcherId", "day");

-- AddForeignKey
ALTER TABLE "LauncherDailyMetric"
ADD CONSTRAINT "LauncherDailyMetric_launcherId_fkey"
FOREIGN KEY ("launcherId") REFERENCES "Launcher"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- The custom schema is private to the Prisma backend. RLS adds defense in depth
-- if this schema is ever exposed through the Supabase Data API.
ALTER TABLE "LauncherDailyMetric" ENABLE ROW LEVEL SECURITY;
