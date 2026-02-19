import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/guest";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeployClient } from "./deploy-client";

export default async function DeployDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  let userId = session?.user?.id ?? await getOrCreateGuestUserId();

  const { id } = await params;
  let deployment = await prisma.deployment.findFirst({
    where: { id },
  });

  if (!deployment) notFound();

  // Claim deployment: if it was created by a guest and user just signed in with GitHub, transfer ownership
  if (
    deployment.userId.startsWith("guest_") &&
    session?.user?.id &&
    !session.user.id.startsWith("guest_")
  ) {
    const oldGuestId = deployment.userId;
    await prisma.deployment.update({
      where: { id },
      data: { userId: session.user.id },
    });
    // Migrate Vercel connection from guest to real user
    const guestVercel = await prisma.userConnection.findFirst({
      where: { userId: oldGuestId, provider: "vercel" },
    });
    if (guestVercel) {
      await prisma.userConnection.upsert({
        where: { userId_provider: { userId: session.user.id, provider: "vercel" } },
        create: {
          userId: session.user.id,
          provider: "vercel",
          accessToken: guestVercel.accessToken,
          refreshToken: guestVercel.refreshToken,
          expiresAt: guestVercel.expiresAt,
        },
        update: {
          accessToken: guestVercel.accessToken,
          refreshToken: guestVercel.refreshToken,
          expiresAt: guestVercel.expiresAt,
        },
      });
      await prisma.userConnection.delete({
        where: { id: guestVercel.id },
      });
    }
    deployment = { ...deployment, userId: session.user.id };
    userId = session.user.id;
  } else if (deployment.userId !== userId) {
    notFound(); // Not owner
  }

  const [account, connections] = await Promise.all([
    prisma.account.findFirst({ where: { userId, provider: "github" } }),
    prisma.userConnection.findMany({ where: { userId } }),
  ]);

  const hasGithub = !!account?.access_token || connections.some((c) => c.provider === "github");
  const hasVercel = connections.some((c) => c.provider === "vercel");

  let envVars: { database?: unknown; paymentGateways?: string[]; buildCommand?: string } = {};
  try {
    envVars = deployment.envVars ? JSON.parse(deployment.envVars) : {};
  } catch {
    // ignore
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard"
        className="text-slate-400 hover:text-white text-sm mb-6 inline-block"
      >
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-2">{deployment.name}</h1>
      <p className="text-slate-400 mb-6">
        Framework: {deployment.framework}
        {envVars.database && (envVars.database as { type?: string }).type !== "none"
          ? ` • Database: ${(envVars.database as { type?: string }).type}`
          : ""}
      </p>

      <DeployClient
        deploymentId={deployment.id}
        hasGithub={hasGithub}
        hasVercel={hasVercel}
        status={deployment.status}
        liveUrl={deployment.liveUrl}
        errorMessage={deployment.errorMessage}
      />
    </div>
  );
}
