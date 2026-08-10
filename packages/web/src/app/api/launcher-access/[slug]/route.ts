import { NextResponse } from "next/server";
import { SafeSlugSchema } from "@jach/shared";
import { prisma } from "../../../../lib/db";
import { isDemoSlug } from "../../../../lib/demo-slugs";
import {
  launcherAccessIdentity,
  LauncherAccessAccountSchema,
} from "../../../../lib/launcher-access-contract";
import { consumeRateLimit } from "../../../../lib/rate-limit";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const headers = corsHeaders();
  if (!consumeRateLimit(request, "launcher-access", 120, 10 * 60_000)) {
    return NextResponse.json(
      {
        allowed: false,
        code: "RATE_LIMITED",
        message: "Trop de tentatives. Réessaie plus tard.",
      },
      { status: 429, headers },
    );
  }

  const parsed = LauncherAccessAccountSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        allowed: false,
        code: "INVALID_REQUEST",
        message: "Identité invalide.",
      },
      { status: 400, headers },
    );
  }

  const parsedSlug = SafeSlugSchema.safeParse((await params).slug);
  if (!parsedSlug.success) {
    return NextResponse.json(
      {
        allowed: false,
        code: "INVALID_REQUEST",
        message: "Launcher invalide.",
      },
      { status: 400, headers },
    );
  }
  const slug = parsedSlug.data;
  const { subjectType, subjectValue } = launcherAccessIdentity(parsed.data);

  try {
    if (isDemoSlug(slug)) {
      const globalBan = await findActivePlayerBan(
        subjectType,
        subjectValue,
        null,
      );
      return globalBan
        ? denied(
            "PLAYER_BANNED",
            "Ton accès aux launchers de la plateforme est interdit.",
            headers,
          )
        : NextResponse.json({ allowed: true }, { headers });
    }

    const launcher = await prisma.launcher.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        suspendedAt: true,
        owner: { select: { disabledAt: true } },
      },
    });
    if (!launcher || launcher.status !== "published") {
      return denied(
        "LAUNCHER_UNAVAILABLE",
        "Ce launcher n'est pas disponible.",
        headers,
      );
    }
    if (launcher.suspendedAt) {
      return denied(
        "LAUNCHER_SUSPENDED",
        "Ce launcher est temporairement suspendu.",
        headers,
      );
    }
    if (launcher.owner.disabledAt) {
      return denied(
        "OWNER_DISABLED",
        "Ce launcher est temporairement indisponible.",
        headers,
      );
    }

    const playerBan = await findActivePlayerBan(
      subjectType,
      subjectValue,
      launcher.id,
    );
    if (playerBan) {
      return denied(
        "PLAYER_BANNED",
        "Ton accès à ce launcher est interdit.",
        headers,
      );
    }

    return NextResponse.json({ allowed: true }, { headers });
  } catch (error) {
    console.error("Launcher access check failed", { slug, error });
    return denied(
      "ACCESS_CHECK_UNAVAILABLE",
      "Le contrôle d'accès est temporairement indisponible.",
      headers,
      503,
    );
  }
}

async function findActivePlayerBan(
  subjectType: "microsoft_uuid" | "offline_username",
  subjectValue: string,
  launcherId: string | null,
) {
  const scope = launcherId
    ? { OR: [{ launcherId: null }, { launcherId }] }
    : { launcherId: null };
  return prisma.playerBan.findFirst({
    where: {
      subjectType,
      subjectValue,
      revokedAt: null,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        scope,
      ],
    },
    select: { id: true },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function denied(
  code: string,
  message: string,
  headers: Record<string, string>,
  status = 200,
) {
  return NextResponse.json(
    { allowed: false, code, message },
    { status, headers },
  );
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Accept, Content-Type, X-YourLauncher-Client",
    "Cache-Control": "no-store",
  };
}
