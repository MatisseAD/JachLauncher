-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Launcher" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "backgroundUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#5b8cff',
    "secondaryColor" TEXT NOT NULL DEFAULT '#00d18f',
    "textColor" TEXT NOT NULL DEFAULT '#e6edf3',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "visualStyle" TEXT NOT NULL DEFAULT 'premium',
    "buttonStyle" TEXT NOT NULL DEFAULT 'glow',
    "cardShape" TEXT NOT NULL DEFAULT 'rounded',
    "menuPlacement" TEXT NOT NULL DEFAULT 'left',
    "showNews" BOOLEAN NOT NULL DEFAULT true,
    "showDiscord" BOOLEAN NOT NULL DEFAULT false,
    "showWebsite" BOOLEAN NOT NULL DEFAULT false,
    "discordUrl" TEXT,
    "websiteUrl" TEXT,
    "supportUrl" TEXT,
    "ambiance" TEXT NOT NULL DEFAULT 'none',
    "mcVersion" TEXT NOT NULL DEFAULT '1.20.1',
    "loader" TEXT NOT NULL DEFAULT 'vanilla',
    "loaderVersion" TEXT,
    "javaMajor" INTEGER,
    "launcherType" TEXT NOT NULL DEFAULT 'vanilla',
    "serverAddress" TEXT,
    "serverPort" INTEGER,
    "preLaunchMessage" TEXT NOT NULL DEFAULT '',
    "memMin" INTEGER NOT NULL DEFAULT 1024,
    "memMax" INTEGER NOT NULL DEFAULT 4096,
    "mods" TEXT NOT NULL DEFAULT '[]',
    "resourcepacks" TEXT NOT NULL DEFAULT '[]',
    "shaderpacks" TEXT NOT NULL DEFAULT '[]',
    "news" TEXT NOT NULL DEFAULT '[]',
    "events" TEXT NOT NULL DEFAULT '[]',
    "patchNotes" TEXT NOT NULL DEFAULT '[]',
    "maintenance" TEXT NOT NULL DEFAULT '{"active":false}',
    "alert" TEXT NOT NULL DEFAULT '{"active":false,"kind":"info","message":""}',
    "jvmArgs" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Launcher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Launcher_slug_key" ON "Launcher"("slug");

-- CreateIndex
CREATE INDEX "Launcher_ownerId_idx" ON "Launcher"("ownerId");

-- AddForeignKey
ALTER TABLE "Launcher"
ADD CONSTRAINT "Launcher_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
