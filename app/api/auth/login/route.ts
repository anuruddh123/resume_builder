import { NextResponse } from "next/server";
import { z } from "zod";
import { comparePassword } from "@/lib/auth/passwords";
import { findUserByEmail } from "@/lib/auth/store";
import { AUTH_COOKIE_NAME, signToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = LoginSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid email or password" },
        { status: 400 },
      );
    }

    const { email, password } = result.data;
    const userWithPassword = await findUserByEmail(email);
    if (!userWithPassword) {
      return NextResponse.json(
        { error: "Invalid email or password. Please try again." },
        { status: 401 },
      );
    }

    const isValid = await comparePassword(password, userWithPassword.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password. Please try again." },
        { status: 401 },
      );
    }

    const { passwordHash: _ignored, ...user } = userWithPassword;

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const isProduction = process.env.NODE_ENV === "production";
    const cookieHeader = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isProduction ? "; Secure" : ""}`;

    return NextResponse.json(
      { user },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookieHeader,
        },
      },
    );
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong during sign in. Please try again." },
      { status: 500 },
    );
  }
}
