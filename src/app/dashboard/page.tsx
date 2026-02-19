import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/guest";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id ?? await getOrCreateGuestUserId();

  const deployments = await prisma.deployment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const [account, connections] = await Promise.all([
    prisma.account.findFirst({ where: { userId, provider: "github" } }),
    prisma.userConnection.findMany({ where: { userId } }),
  ]);

  const hasGithub = !!account?.access_token;
  const hasVercel = connections.some((c) => c.provider === "vercel");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/deploy"
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + New Deployment
        </Link>
      </div>

      {(!hasGithub || !hasVercel) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <p className="text-amber-200 font-medium mb-2">Connect your accounts</p>
          <p className="text-slate-400 text-sm mb-3">
            To deploy, you need to connect GitHub and Vercel. We&apos;ll use
            these to create repos and deploy your apps automatically.
          </p>
          <Link
            href="/deploy"
            className="text-amber-400 hover:text-amber-300 text-sm font-medium"
          >
            Connect when you deploy →
          </Link>
        </div>
      )}

      <div className="mb-6">
        <p className="text-slate-400 text-sm">
          Free tier: {deployments.filter((d) => d.status === "ready").length} / 1 deployment used
        </p>
      </div>

      {deployments.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
          <p className="text-slate-400 mb-4">No deployments yet</p>
          <Link
            href="/deploy"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Deploy your first app →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {deployments.map((d) => (
            <div
              key={d.id}
              className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-slate-400 text-sm">
                  {d.framework} • {d.status}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {d.liveUrl && (
                  <a
                    href={d.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-sm"
                  >
                    Open →
                  </a>
                )}
                {d.status === "ready" && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                    Live
                  </span>
                )}
                {d.status === "failed" && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                    Failed
                  </span>
                )}
                {d.status === "pending" && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                    Building...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
