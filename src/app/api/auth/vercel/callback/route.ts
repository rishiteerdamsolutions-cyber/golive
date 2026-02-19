import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/guest";

interface TokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/deploy?error=no_code", req.url));
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("vercel_oauth_state")?.value;
    const codeVerifier = cookieStore.get("vercel_oauth_code_verifier")?.value;
    const callbackUrl = cookieStore.get("vercel_oauth_callback")?.value || "/dashboard";

    if (!state || state !== storedState || !codeVerifier) {
      return NextResponse.redirect(new URL("/deploy?error=invalid_state", req.url));
    }

    const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
    const clientSecret = process.env.VERCEL_APP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL("/deploy?error=config", req.url));
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: `${req.nextUrl.origin}/api/auth/vercel/callback`,
    });

    const tokenRes = await fetch("https://api.vercel.com/login/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error("Vercel token exchange failed:", err);
      return NextResponse.redirect(new URL("/deploy?error=token_failed", req.url));
    }

    const tokenData = (await tokenRes.json()) as TokenData;

    const session = await auth();
    const userId = session?.user?.id ?? await getOrCreateGuestUserId();

    await prisma.userConnection.upsert({
      where: { userId_provider: { userId, provider: "vercel" } },
      create: {
        userId,
        provider: "vercel",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    cookieStore.set("vercel_oauth_state", "", { maxAge: 0, path: "/" });
    cookieStore.set("vercel_oauth_nonce", "", { maxAge: 0, path: "/" });
    cookieStore.set("vercel_oauth_code_verifier", "", { maxAge: 0, path: "/" });
    cookieStore.set("vercel_oauth_callback", "", { maxAge: 0, path: "/" });

    const redirectUrl = callbackUrl.startsWith("http") ? callbackUrl : new URL(callbackUrl, req.url).toString();
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("Vercel OAuth callback error:", err);
    return NextResponse.redirect(new URL("/deploy?error=callback_failed", req.url));
  }
}
