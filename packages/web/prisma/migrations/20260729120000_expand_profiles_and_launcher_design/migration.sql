-- Account profile fields. Email stays nullable so existing accounts remain
-- valid; PostgreSQL permits several NULL values in a UNIQUE index.
ALTER TABLE "User"
ADD COLUMN "email" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Fine-grained launcher appearance. Defaults keep every existing launcher
-- visually compatible while exposing the new controls immediately.
ALTER TABLE "Launcher"
ADD COLUMN "backgroundFit" TEXT NOT NULL DEFAULT 'cover',
ADD COLUMN "backgroundPosition" TEXT NOT NULL DEFAULT 'center',
ADD COLUMN "backgroundOverlay" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN "backgroundBlur" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "panelOpacity" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN "fontFamily" TEXT NOT NULL DEFAULT 'poppins',
ADD COLUMN "cornerRadius" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN "contentDensity" TEXT NOT NULL DEFAULT 'comfortable',
ADD COLUMN "sidebarStyle" TEXT NOT NULL DEFAULT 'glass',
ADD COLUMN "logoShape" TEXT NOT NULL DEFAULT 'rounded',
ADD COLUMN "playButtonLabel" TEXT NOT NULL DEFAULT 'JOUER',
ADD COLUMN "showServerStatus" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Launcher"
ADD CONSTRAINT "Launcher_backgroundOverlay_check"
  CHECK ("backgroundOverlay" BETWEEN 0 AND 90),
ADD CONSTRAINT "Launcher_backgroundBlur_check"
  CHECK ("backgroundBlur" BETWEEN 0 AND 20),
ADD CONSTRAINT "Launcher_panelOpacity_check"
  CHECK ("panelOpacity" BETWEEN 20 AND 100),
ADD CONSTRAINT "Launcher_cornerRadius_check"
  CHECK ("cornerRadius" BETWEEN 0 AND 32),
ADD CONSTRAINT "Launcher_backgroundFit_check"
  CHECK ("backgroundFit" IN ('cover', 'contain', 'fill')),
ADD CONSTRAINT "Launcher_backgroundPosition_check"
  CHECK ("backgroundPosition" IN ('center', 'top', 'bottom', 'left', 'right')),
ADD CONSTRAINT "Launcher_fontFamily_check"
  CHECK ("fontFamily" IN ('poppins', 'inter', 'system', 'serif', 'pixel')),
ADD CONSTRAINT "Launcher_contentDensity_check"
  CHECK ("contentDensity" IN ('compact', 'comfortable', 'spacious')),
ADD CONSTRAINT "Launcher_sidebarStyle_check"
  CHECK ("sidebarStyle" IN ('glass', 'solid', 'floating')),
ADD CONSTRAINT "Launcher_logoShape_check"
  CHECK ("logoShape" IN ('square', 'rounded', 'circle'));
