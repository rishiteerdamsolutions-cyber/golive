"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JSZip from "jszip";

const SKIP_DIRS = ["node_modules", ".git", ".next", "dist", "build", ".golive-uploads"];

async function readDirRecursive(
  dirHandle: FileSystemDirectoryHandle,
  path = ""
): Promise<{ path: string; file: File }[]> {
  const files: { path: string; file: File }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [name, handle] of (dirHandle as any).entries()) {
    const fullPath = path ? `${path}/${name}` : name;
    if (handle.kind === "directory") {
      if (SKIP_DIRS.includes(name)) continue;
      const subFiles = await readDirRecursive(handle as FileSystemDirectoryHandle, fullPath);
      files.push(...subFiles);
    } else {
      const file = await (handle as FileSystemFileHandle).getFile();
      files.push({ path: fullPath, file });
    }
  }
  return files;
}

export default function DeployPage() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleOpenFolder = async () => {
    if (!("showDirectoryPicker" in window)) {
      setError("Folder picker is not supported in this browser. Use Chrome or Edge.");
      return;
    }
    try {
      const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      setDirHandle(handle);
      if (!name.trim()) setName(handle.name.replace(/[^a-z0-9-]/gi, "-").toLowerCase());
      setError("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Failed to open folder");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirHandle || !name.trim()) {
      setError("Please open a folder and provide a project name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const files = await readDirRecursive(dirHandle);
      const zip = new JSZip();
      for (const { path: filePath, file } of files) {
        zip.file(filePath, await file.arrayBuffer());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const formData = new FormData();
      formData.append("file", blob, "project.zip");
      formData.append("name", name.trim());

      const res = await fetch("/api/deploy/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      router.push(`/deploy/${data.deploymentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
        ← Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-2">Deploy your project</h1>
      <p className="text-slate-400 mb-8">
        Open your project folder (like Cursor). We&apos;ll detect the framework,
        create a GitHub repo, and deploy to Vercel.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Project name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-awesome-app"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Project folder</label>
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center hover:border-slate-500 transition-colors">
            <button
              type="button"
              onClick={handleOpenFolder}
              className="cursor-pointer block w-full"
            >
              {dirHandle ? (
                <p className="text-emerald-400 font-medium">📁 {dirHandle.name}</p>
              ) : (
                <>
                  <p className="text-slate-400 mb-1">
                    Click to open your project folder
                  </p>
                  <p className="text-slate-500 text-sm">
                    Works like Cursor — select the folder containing your app
                  </p>
                  <p className="text-slate-600 text-xs mt-2">
                    Chrome or Edge required
                  </p>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !dirHandle}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "Preparing..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
