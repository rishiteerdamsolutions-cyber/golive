"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeployError {
  error: string;
  action?: string;
  installUrl?: string;
}

export function DeployClient({
  deploymentId,
  hasGithub,
  hasVercel,
  status,
  liveUrl,
  errorMessage,
}: {
  deploymentId: string;
  hasGithub: boolean;
  hasVercel: boolean;
  status: string;
  liveUrl: string | null;
  errorMessage: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [integrationInstallUrl, setIntegrationInstallUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleConnectGithub = () => {
    window.location.href = `/api/auth/signin/github?callbackUrl=${encodeURIComponent(`/deploy/${deploymentId}`)}`;
  };

  const handleConnectVercel = () => {
    window.location.href = `/api/auth/vercel/authorize?callbackUrl=${encodeURIComponent(`/deploy/${deploymentId}`)}`;
  };

  const handleDeploy = async () => {
    if (!hasGithub || !hasVercel) {
      setError("Please connect both GitHub and Vercel first");
      return;
    }
    setLoading(true);
    setError("");
    setIntegrationInstallUrl(null);
    try {
      const res = await fetch(`/api/deploy/${deploymentId}/run`, {
        method: "POST",
      });
      const data: DeployError & { success?: boolean } = await res.json();
      if (!res.ok) {
        if (data.action === "install_integration" && data.installUrl) {
          setIntegrationInstallUrl(data.installUrl);
        }
        throw new Error(data.error || "Deploy failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setLoading(false);
    }
  };

  if (status === "ready" && liveUrl) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
        <p className="text-emerald-400 font-medium mb-2">Your app is live!</p>
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          {liveUrl}
        </a>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400 font-medium mb-2">Deployment failed</p>
        <p className="text-slate-400 text-sm mb-4">{errorMessage || "Unknown error"}</p>
        <button
          onClick={handleDeploy}
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <span>GitHub</span>
          {hasGithub ? (
            <span className="text-emerald-400 text-sm">Connected</span>
          ) : (
            <button
              onClick={handleConnectGithub}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Sign in with GitHub
            </button>
          )}
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <span>Vercel</span>
          {hasVercel ? (
            <span className="text-emerald-400 text-sm">Connected</span>
          ) : (
            <button
              onClick={handleConnectVercel}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Sign in with Vercel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
          {integrationInstallUrl && (
            <a
              href={integrationInstallUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Install Integration (free)
            </a>
          )}
        </div>
      )}

      <button
        onClick={handleDeploy}
        disabled={!hasGithub || !hasVercel || loading || status === "building"}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 rounded-lg transition-colors"
      >
        {status === "building"
          ? "Building..."
          : loading
            ? "Deploying..."
            : "Deploy to Vercel"}
      </button>
    </div>
  );
}
