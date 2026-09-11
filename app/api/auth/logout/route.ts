import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export async function POST() {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieHeader = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? "; Secure" : ""}`;

  return NextResponse.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": cookieHeader,
      },
    },
  );
}
