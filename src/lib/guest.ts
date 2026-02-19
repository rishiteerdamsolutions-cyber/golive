import { cookies } from "next/headers";
import { prisma } from "./db";

const GUEST_COOKIE = "golive_guest_id";

export async function getOrCreateGuestUserId(): Promise<string> {
  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE)?.value;

  if (!guestId) {
    guestId = `guest_${crypto.randomUUID()}`;
    cookieStore.set(GUEST_COOKIE, guestId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: "lax",
    });
  }

  let user = await prisma.user.findUnique({ where: { id: guestId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: guestId,
        email: `${guestId}@golive.local`,
        name: "Guest",
      },
    });
  }

  return guestId;
}
