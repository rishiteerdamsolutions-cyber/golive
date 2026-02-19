import { NextRequest, NextResponse } from "next/server";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "GitHub OAuth is misconfigured. Check AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, and that your GitHub OAuth App callback URL is exactly: https://golive-nine.vercel.app/api/auth/callback/github",
  AccessDenied: "Access was denied.",
  Verification: "The verification link has expired or was already used.",
  Default: "An error occurred during sign in.",
  Callback: "Error in the OAuth callback. Check database connection and GitHub callback URL.",
  OAuthCallback: "Error exchanging OAuth code. Verify GitHub app credentials.",
  OAuthCreateAccount: "Could not create user account. Check database.",
};

/**
 * NextAuth redirects to /api/auth/error on sign-in failure.
 * Return HTML directly to avoid 500 from redirect/page load.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error") || "Configuration";
  const message = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Sign in failed</title></head>
<body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:2rem;text-align:center;background:#0f172a;color:#e2e8f0;">
  <a href="/" style="color:#34d399;font-weight:bold;">← OMGItsLive</a>
  <h1 style="font-size:1.5rem;margin:1.5rem 0;">Sign in failed</h1>
  <p style="color:#94a3b8;margin-bottom:1rem;">${message.replace(/</g, "&lt;")}</p>
  <p style="color:#64748b;font-size:0.875rem;margin-bottom:1.5rem;">Error code: <code style="background:#1e293b;padding:0.25rem 0.5rem;border-radius:0.25rem;">${error.replace(/</g, "&lt;")}</code></p>
  <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
    <a href="/login" style="padding:0.5rem 1rem;background:#059669;color:white;border-radius:0.5rem;text-decoration:none;">Try again</a>
    <a href="/api/debug" style="padding:0.5rem 1rem;background:#334155;color:white;border-radius:0.5rem;text-decoration:none;">Check config</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
