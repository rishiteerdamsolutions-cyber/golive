import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let dbOk = false;
  let dbError = "";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const hasGitHub =
    !!process.env.AUTH_GITHUB_ID && !!process.env.AUTH_GITHUB_SECRET;
  const hasVercel =
    !!process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID &&
    !!process.env.VERCEL_APP_CLIENT_SECRET;

  return NextResponse.json({
    env: {
      AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ? "SET" : "MISSING",
      AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ? "SET" : "MISSING",
      NEXT_PUBLIC_VERCEL_APP_CLIENT_ID: process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID
        ? "SET"
        : "MISSING",
      VERCEL_APP_CLIENT_SECRET: process.env.VERCEL_APP_CLIENT_SECRET
        ? "SET"
        : "MISSING",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "MISSING",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      NODE_ENV: process.env.NODE_ENV,
    },
    db: dbOk ? "OK" : "FAILED",
    dbError: dbError || undefined,
    auth: {
      hasGitHub,
      hasVercel,
      githubCallbackUrl: `${process.env.NEXTAUTH_URL || "https://golive-nine.vercel.app"}/api/auth/callback/github`,
    },
  });
}
