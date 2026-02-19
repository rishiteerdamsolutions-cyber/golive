import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";

function generateSecureRandomString(length: number) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomBytes, (byte) => charset[byte % charset.length]).join("");
}

export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
  const clientSecret = process.env.VERCEL_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/deploy?error=vercel_not_configured", req.url)
    );
  }

  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/dashboard";
  const state = generateSecureRandomString(43);
  const nonce = generateSecureRandomString(43);
  const codeVerifier = crypto.randomBytes(43).toString("hex");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const cookieStore = await cookies();
  cookieStore.set("vercel_oauth_state", state, {
    maxAge: 10 * 60,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  cookieStore.set("vercel_oauth_nonce", nonce, {
    maxAge: 10 * 60,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  cookieStore.set("vercel_oauth_code_verifier", codeVerifier, {
    maxAge: 10 * 60,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  cookieStore.set("vercel_oauth_callback", callbackUrl, {
    maxAge: 10 * 60,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  const origin = req.nextUrl.origin;
  const queryParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/vercel/callback`,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    response_type: "code",
    scope: "openid email profile offline_access",
  });

  const authorizationUrl = `https://vercel.com/oauth/authorize?${queryParams.toString()}`;
  return NextResponse.redirect(authorizationUrl);
}
