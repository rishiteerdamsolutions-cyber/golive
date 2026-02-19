"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const message = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="text-emerald-400 font-bold text-lg block mb-8">
          ← OMGItsLive
        </Link>
        <h1 className="text-2xl font-bold mb-2">Sign in failed</h1>
        <p className="text-slate-400 mb-4">{message}</p>
        <p className="text-slate-500 text-sm mb-6">
          Error code: <code className="bg-slate-800 px-2 py-1 rounded">{error}</code>
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
          >
            Try again
          </Link>
          <Link
            href="/api/debug"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
          >
            Check config
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
