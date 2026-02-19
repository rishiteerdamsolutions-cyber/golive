import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    env: {
      AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ? "SET" : "MISSING",
      AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ? "SET" : "MISSING",
      NEXT_PUBLIC_VERCEL_APP_CLIENT_ID: process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID ? "SET" : "MISSING",
      VERCEL_APP_CLIENT_SECRET: process.env.VERCEL_APP_CLIENT_SECRET ? "SET" : "MISSING",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "MISSING",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
