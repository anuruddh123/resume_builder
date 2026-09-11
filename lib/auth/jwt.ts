import { SignJWT, jwtVerify } from "jose";
import type { TokenPayload } from "./types";

export const AUTH_COOKIE_NAME = "rt_session";
const JWT_SECRET = process.env.JWT_SECRET || "resume-craft-secure-jwt-auth-secret-key-2026";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: (payload.role === "admin" ? "admin" : "user"),
    };
  } catch {
    return null;
  }
}
