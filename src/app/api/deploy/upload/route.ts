import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/guest";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  detectFramework,
  detectDatabase,
  detectPaymentGateway,
  getBuildCommand,
} from "@/lib/detect";
import type { PackageJson } from "@/lib/types";

const UPLOAD_DIR = path.join(process.cwd(), ".golive-uploads");

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? await getOrCreateGuestUserId();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = (formData.get("name") as string)?.trim();

    if (!file || !name) {
      return NextResponse.json(
        { error: "Missing file or project name" },
        { status: 400 }
      );
    }

    const deployments = await prisma.deployment.count({
      where: { userId, status: "ready" },
    });
    if (deployments >= 1) {
      return NextResponse.json(
        { error: "Free tier limit reached. Upgrade to Pro for unlimited deployments." },
        { status: 403 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);
    const packageJsonFile = Object.keys(zip.files).find(
      (f) => f.endsWith("package.json") && !f.includes("node_modules")
    );

    let packageJson: PackageJson = {};
    let framework = "static";
    let database: { type: string; envVars: string[] } = { type: "none", envVars: [] };
    let paymentGateways: string[] = [];
    let buildCommand = "npm run build";

    if (packageJsonFile) {
      const content = await zip.files[packageJsonFile].async("string");
      try {
        packageJson = JSON.parse(content) as PackageJson;
        framework = detectFramework(packageJson);
        database = detectDatabase(packageJson);
        paymentGateways = detectPaymentGateway(packageJson);
        buildCommand = getBuildCommand(packageJson);
      } catch {
        // ignore parse errors
      }
    }

    const deployment = await prisma.deployment.create({
      data: {
        userId,
        name: name.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
        status: "pending",
        framework,
        envVars: JSON.stringify({
          database,
          paymentGateways,
          buildCommand,
        }),
      },
    });

    await mkdir(UPLOAD_DIR, { recursive: true });
    const zipPath = path.join(UPLOAD_DIR, `${deployment.id}.zip`);
    await writeFile(zipPath, buffer);

    return NextResponse.json({
      deploymentId: deployment.id,
      analysis: { framework, database, paymentGateways },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
