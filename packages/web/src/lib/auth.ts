import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE_NAME = "jach_session";

function sessionSecret(): Uint8Array {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) {
    return new TextEncoder().encode(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET doit contenir au moins 32 caractères en production",
    );
  }
  return new TextEncoder().encode("dev-secret-change-me-local-only");
}

export interface SessionPayload {
  userId: string;
  username: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Crée un JWT signé et le pose en cookie httpOnly. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Lit la session courante depuis le cookie, ou null si non connecté. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (typeof payload.userId !== "string") return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, disabledAt: true },
    });
    if (!user || user.disabledAt) return null;
    return {
      userId: user.id,
      username: user.username,
    };
  } catch {
    return null;
  }
}

/** Variante qui lève si non connecté (pour les routes protégées). */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
