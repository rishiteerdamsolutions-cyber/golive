import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/guest";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const token = searchParams.get("token");

  const session = await auth();
  const userId = session?.user?.id ?? await getOrCreateGuestUserId();

  if (token) {
    await prisma.userConnection.upsert({
      where: { userId_provider: { userId, provider: "vercel" } },
      create: { userId, provider: "vercel", accessToken: token },
      update: { accessToken: token },
    });
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  }

  return NextResponse.redirect(new URL(`/deploy/connect-vercel?callbackUrl=${encodeURIComponent(callbackUrl)}`, req.url));
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? await getOrCreateGuestUserId();

    const { token } = await req.json();
    if (!token?.trim()) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    await prisma.userConnection.upsert({
      where: { userId_provider: { userId, provider: "vercel" } },
      create: { userId, provider: "vercel", accessToken: token.trim() },
      update: { accessToken: token.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
  }
}
