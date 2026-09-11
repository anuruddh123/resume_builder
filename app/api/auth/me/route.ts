import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    return NextResponse.json({ user: user || null });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null });
  }
}
