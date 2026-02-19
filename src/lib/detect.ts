import type { PackageJson } from "./types";

export function detectFramework(packageJson: PackageJson): string {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if (deps.next) return "nextjs";
  if (deps["react-scripts"] || deps.react) return "react";
  if (deps.vue) return "vue";
  if (deps.svelte || deps["@sveltejs/kit"]) return "svelte";
  if (deps.astro) return "astro";
  if (deps.nuxt || deps["nuxt3"]) return "nuxt";

  return "static";
}

export function detectDatabase(packageJson: PackageJson): {
  type: "mongodb" | "postgresql" | "mysql" | "supabase" | "none";
  envVars: string[];
} {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if (deps.mongoose || deps["mongodb"]) {
    return {
      type: "mongodb",
      envVars: ["MONGODB_URI", "DATABASE_URL", "MONGO_URI"],
    };
  }

  if (deps.prisma || deps["drizzle-orm"] || deps.drizzle) {
    return {
      type: "postgresql",
      envVars: ["DATABASE_URL"],
    };
  }

  if (deps["@supabase/supabase-js"]) {
    return {
      type: "supabase",
      envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    };
  }

  if (deps.mysql || deps.mysql2) {
    return {
      type: "mysql",
      envVars: ["DATABASE_URL"],
    };
  }

  return { type: "none", envVars: [] };
}

export function detectPaymentGateway(packageJson: PackageJson): string[] {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const gateways: string[] = [];

  if (deps.razorpay || deps["razorpay"]) gateways.push("razorpay");
  if (deps.stripe || deps["@stripe/stripe-js"]) gateways.push("stripe");
  if (deps["@paypal/react-paypal-js"] || deps["paypal-rest-sdk"]) gateways.push("paypal");
  if (deps["@lemonsqueezy/lemonsqueezy.js"]) gateways.push("lemonsqueezy");

  return gateways;
}

export function getBuildCommand(packageJson: PackageJson): string {
  const scripts = packageJson.scripts || {};
  return scripts.build || "npm run build";
}

export function getOutputDir(packageJson: PackageJson): string {
  const scripts = packageJson.scripts || {};
  if (scripts.build?.includes("next")) return ".next";
  if (scripts.build?.includes("react-scripts")) return "build";
  if (scripts.build?.includes("vite")) return "dist";
  return "out";
}
