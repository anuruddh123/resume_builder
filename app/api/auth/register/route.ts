import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/passwords";
import { createUser, findUserByEmail } from "@/lib/auth/store";
import { AUTH_COOKIE_NAME, signToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = RegisterSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid registration data" },
        { status: 400 },
      );
    }

    const { name, email, password } = result.data;
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ name, email, passwordHash });

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
        status: 201,
        headers: {
          "Set-Cookie": cookieHeader,
        },
      },
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Something went wrong during registration. Please try again." },
      { status: 500 },
    );
  }
}
