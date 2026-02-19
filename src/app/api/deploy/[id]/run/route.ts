import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/guest";
import { provisionDatabase } from "@/lib/database-provision";
import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import JSZip from "jszip";
import path from "path";
import { readFile } from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), ".golive-uploads");

const SKIP_PATHS = ["node_modules", ".git", ".next", "dist", "build", ".golive-uploads"];

function shouldSkip(filePath: string): boolean {
  return SKIP_PATHS.some((p) => filePath.includes(p));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? await getOrCreateGuestUserId();

    const { id } = await params;

    const deployment = await prisma.deployment.findFirst({
      where: { id, userId },
    });
    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    const [account, githubConnection] = await Promise.all([
      prisma.account.findFirst({ where: { userId, provider: "github" } }),
      prisma.userConnection.findFirst({ where: { userId, provider: "github" } }),
    ]);
    const vercelConnection = await prisma.userConnection.findFirst({
      where: { userId, provider: "vercel" },
    });

    const githubToken = account?.access_token ?? githubConnection?.accessToken;
    if (!githubToken) {
      return NextResponse.json(
        { error: "Connect GitHub first" },
        { status: 400 }
      );
    }
    if (!vercelConnection?.accessToken) {
      return NextResponse.json(
        { error: "Connect Vercel first" },
        { status: 400 }
      );
    }

    const successfulDeploys = await prisma.deployment.count({
      where: { userId, status: "ready" },
    });
    if (successfulDeploys >= 1) {
      return NextResponse.json(
        { error: "Free tier limit reached" },
        { status: 403 }
      );
    }

    await prisma.deployment.update({
      where: { id },
      data: { status: "building", errorMessage: null },
    });

    const zipPath = path.join(UPLOAD_DIR, `${id}.zip`);
    let zipBuffer: Buffer;
    try {
      zipBuffer = await readFile(zipPath);
    } catch {
      await prisma.deployment.update({
        where: { id },
        data: { status: "failed", errorMessage: "Upload expired. Please upload again." },
      });
      return NextResponse.json(
        { error: "Upload expired. Please upload again." },
        { status: 400 }
      );
    }

    const zip = await JSZip.loadAsync(zipBuffer);
    const files: { path: string; content: Buffer }[] = [];

    for (const [filePath, file] of Object.entries(zip.files)) {
      if (file.dir || shouldSkip(filePath)) continue;
      const parts = filePath.split("/").filter(Boolean);
      const cleanPath = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
      if (!cleanPath) continue;
      const content = await file.async("nodebuffer");
      files.push({ path: cleanPath, content });
    }

    if (files.length === 0) {
      for (const [filePath, file] of Object.entries(zip.files)) {
        if (file.dir || shouldSkip(filePath)) continue;
        const content = await file.async("nodebuffer");
        const cleanPath = filePath.replace(/^[^/]+\//, "");
        if (cleanPath) files.push({ path: cleanPath, content });
      }
    }

    const octokit = new Octokit({ auth: githubToken });

    let repoFullName: string;
    try {
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: deployment.name,
        description: "Deployed with GoLive",
        private: false,
        auto_init: true,
      });
      repoFullName = repo.full_name;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create GitHub repo";
      await prisma.deployment.update({
        where: { id },
        data: { status: "failed", errorMessage: msg },
      });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const [owner, repo] = repoFullName.split("/");
    const branch = "main";

    for (const file of files.slice(0, 200)) {
      try {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: `Add ${file.path}`,
          content: file.content.toString("base64"),
          branch,
        });
      } catch (fileErr) {
        console.error(`Failed to add ${file.path}:`, fileErr);
      }
    }

    const repoUrl = `https://github.com/${repoFullName}`;
    await prisma.deployment.update({
      where: { id },
      data: { repoUrl },
    });

    const vercelToken = vercelConnection.accessToken;

    const projectRes = await fetch("https://api.vercel.com/v11/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: deployment.name,
        framework: deployment.framework === "nextjs" ? "nextjs" : null,
        gitRepository: {
          type: "github",
          repo: repoFullName,
        },
      }),
    });

    if (!projectRes.ok) {
      const errData = await projectRes.json().catch(() => ({}));
      const msg = errData.error?.message || errData.message || "Failed to create Vercel project. Ensure Vercel is connected to GitHub at vercel.com/account/integrations";
      await prisma.deployment.update({
        where: { id },
        data: { status: "failed", errorMessage: msg },
      });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const project = await projectRes.json();

    // Auto-provision database in USER's own Vercel account (GoLive owns nothing)
    try {
      const envVarsJson = deployment.envVars as string;
      const parsed = typeof envVarsJson === "string" ? JSON.parse(envVarsJson) : envVarsJson;
      const dbType = parsed?.database?.type;
      if (dbType && dbType !== "none") {
        const dbResult = await provisionDatabase(
          dbType,
          vercelToken,
          deployment.name,
          project.id
        );
        if (dbResult && !dbResult.success) {
          await prisma.deployment.update({
            where: { id },
            data: {
              status: "failed",
              errorMessage: dbResult.message,
            },
          });
          return NextResponse.json({
            error: dbResult.message,
            action: "install_integration",
            installUrl: dbResult.installUrl,
          }, { status: 400 });
        }
      }
    } catch {
      // non-fatal: deploy continues without database
    }

    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: deployment.name,
        project: project.id,
        target: "production",
        gitSource: {
          type: "github",
          ref: branch,
          repoId: project.link?.repoId ?? project.id,
        },
      }),
    });

    if (!deployRes.ok) {
      const errData = await deployRes.json().catch(() => ({}));
      const msg = errData.error?.message || errData.message || "Failed to deploy";
      await prisma.deployment.update({
        where: { id },
        data: { status: "failed", errorMessage: msg, projectId: project.id },
      });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const deployData = await deployRes.json();
    let liveUrl = deployData.url
      ? (deployData.url.startsWith("http") ? deployData.url : `https://${deployData.url}`)
      : deployData.alias?.[0]
        ? (deployData.alias[0].startsWith("http") ? deployData.alias[0] : `https://${deployData.alias[0]}`)
        : `https://${deployment.name}.vercel.app`;

    await prisma.deployment.update({
      where: { id },
      data: {
        status: "ready",
        liveUrl,
        projectId: project.id,
        deploymentId: deployData.id,
      },
    });

    return NextResponse.json({
      success: true,
      liveUrl,
      repoUrl,
    });
  } catch (err) {
    console.error(err);
    try {
      const { id: errId } = await params;
      await prisma.deployment.update({
        where: { id: errId },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Deploy failed",
      },
    });
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Deploy failed" },
      { status: 500 }
    );
  }
}
