import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyToken } from "./jwt";
import { findUserById } from "./store";
import type { User } from "./types";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden. Admin access required.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getSessionToken(request?: Request): Promise<string | null> {
  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp("(?:^|;\\s*)" + AUTH_COOKIE_NAME + "=([^;]+)"));
      if (match) return decodeURIComponent(match[1]);
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(request?: Request): Promise<User | null> {
  const token = await getSessionToken(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return findUserById(payload.id);
}

export async function requireAuth(request?: Request): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export async function requireAdmin(request?: Request): Promise<User> {
  const user = await requireAuth(request);
  if (user.role !== "admin") {
    throw new ForbiddenError();
  }
  return user;
}
