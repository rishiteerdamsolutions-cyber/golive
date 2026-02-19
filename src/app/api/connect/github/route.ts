import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/guest";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? await getOrCreateGuestUserId();

    const { token } = await req.json();
    if (!token?.trim()) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    await prisma.userConnection.upsert({
      where: {
        userId_provider: { userId, provider: "github" },
      },
      create: {
        userId,
        provider: "github",
        accessToken: token.trim(),
      },
      update: { accessToken: token.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
  }
}
