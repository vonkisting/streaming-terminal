import { signOut } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get("redirectTo") || "/";

  try {
    await signOut({
      redirectTo,
    });
  } catch (error) {
    console.error("Sign out error:", error);
    return NextResponse.redirect(new URL("/?error=signout_failed", request.url));
  }
}
