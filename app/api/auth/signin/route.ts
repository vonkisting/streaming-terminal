import { signIn } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") || "google";
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  try {
    await signIn(provider, {
      redirectTo,
    });
  } catch (error) {
    console.error("Sign in error:", error);
    return NextResponse.redirect(new URL("/?error=signin_failed", request.url));
  }
}
