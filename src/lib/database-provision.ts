/**
 * Automatic database provisioning — runs in the USER's own Vercel account.
 * OMGItsLive owns nothing. Databases are created via Vercel's Storage/Marketplace API
 * using the user's own Vercel OAuth token.
 *
 * Flow:
 *  1. Check if user has Neon (Postgres) or MongoDB Atlas integration installed on Vercel
 *  2. If yes → create a store in their account, connect it to their project
 *  3. If no  → return which integration they need to install (one-click from Vercel dashboard)
 */

const VERCEL_API = "https://api.vercel.com";

interface VercelIntegration {
  id: string;
  slug?: string;
  integrationId?: string;
  installationType?: string;
  productSelection?: Array<{ slug?: string; id?: string }>;
}

export interface ProvisionResult {
  success: true;
  envVars: { key: string; value: string }[];
}

export interface ProvisionNeedsInstall {
  success: false;
  reason: "integration_not_installed";
  integrationSlug: string;
  installUrl: string;
  message: string;
}

export type ProvisionOutcome = ProvisionResult | ProvisionNeedsInstall | null;

async function getVercelIntegrations(vercelToken: string): Promise<VercelIntegration[]> {
  const res = await fetch(`${VERCEL_API}/v1/integrations/configurations`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { configurations?: VercelIntegration[] };
  return data.configurations ?? [];
}

function findIntegration(
  integrations: VercelIntegration[],
  slugMatch: string
): VercelIntegration | undefined {
  return integrations.find(
    (i) =>
      i.slug?.toLowerCase().includes(slugMatch) ||
      i.integrationId?.toLowerCase().includes(slugMatch)
  );
}

async function getIntegrationProducts(
  vercelToken: string,
  configId: string
): Promise<Array<{ id: string; slug?: string; name?: string }>> {
  const res = await fetch(
    `${VERCEL_API}/v1/integrations/configuration/${configId}/products`,
    { headers: { Authorization: `Bearer ${vercelToken}` } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    products?: Array<{ id: string; slug?: string; name?: string }>;
  };
  return data.products ?? [];
}

async function createStore(
  vercelToken: string,
  name: string,
  integrationConfigurationId: string,
  integrationProductIdOrSlug: string
): Promise<{ storeId?: string; resourceId?: string }> {
  const res = await fetch(`${VERCEL_API}/v1/storage/stores/integration/direct`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      integrationConfigurationId,
      integrationProductIdOrSlug,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Vercel createStore failed:", errText);
    return {};
  }

  const data = (await res.json()) as {
    store?: { id?: string; externalResourceId?: string };
  };
  return {
    storeId: data.store?.id,
    resourceId: data.store?.externalResourceId ?? data.store?.id,
  };
}

async function connectStoreToProject(
  vercelToken: string,
  integrationConfigurationId: string,
  resourceId: string,
  projectId: string,
  envVarKeys: string[]
): Promise<boolean> {
  const res = await fetch(
    `${VERCEL_API}/v1/integrations/installations/${integrationConfigurationId}/resources/${resourceId}/connections`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        environments: ["production", "preview", "development"],
        envVarKeys,
      }),
    }
  );

  if (!res.ok) {
    console.error("Vercel connectStore failed:", await res.text());
    return false;
  }
  return true;
}

/**
 * Provision PostgreSQL via Neon integration on user's Vercel account.
 */
export async function provisionPostgres(
  vercelToken: string,
  projectName: string,
  vercelProjectId: string
): Promise<ProvisionOutcome> {
  try {
    const integrations = await getVercelIntegrations(vercelToken);
    const neon = findIntegration(integrations, "neon");

    if (!neon) {
      return {
        success: false,
        reason: "integration_not_installed",
        integrationSlug: "neon",
        installUrl: "https://vercel.com/integrations/neon",
        message:
          "Your project uses a PostgreSQL database. Install the Neon integration on Vercel (free) to continue.",
      };
    }

    const products = await getIntegrationProducts(vercelToken, neon.id);
    const pgProduct =
      products.find((p) => p.slug?.includes("postgres") || p.id?.includes("postgres")) ??
      products[0];
    if (!pgProduct) {
      console.error("No Neon products found for config", neon.id);
      return null;
    }

    const storeName = `omgitslive-${projectName}-${Date.now()}`.slice(0, 128);
    const { storeId, resourceId } = await createStore(
      vercelToken,
      storeName,
      neon.id,
      pgProduct.slug ?? pgProduct.id
    );
    if (!storeId || !resourceId) return null;

    await connectStoreToProject(vercelToken, neon.id, resourceId, vercelProjectId, [
      "DATABASE_URL",
    ]);

    return {
      success: true,
      envVars: [],
    };
  } catch (err) {
    console.error("Postgres provision error:", err);
    return null;
  }
}

/**
 * Provision MongoDB via MongoDB Atlas integration on user's Vercel account.
 */
export async function provisionMongoDB(
  vercelToken: string,
  projectName: string,
  vercelProjectId: string
): Promise<ProvisionOutcome> {
  try {
    const integrations = await getVercelIntegrations(vercelToken);
    const atlas = findIntegration(integrations, "mongodb");

    if (!atlas) {
      return {
        success: false,
        reason: "integration_not_installed",
        integrationSlug: "mongodb-atlas",
        installUrl: "https://vercel.com/integrations/mongodbatlas",
        message:
          "Your project uses MongoDB. Install the MongoDB Atlas integration on Vercel (free) to continue.",
      };
    }

    const products = await getIntegrationProducts(vercelToken, atlas.id);
    const mongoProduct =
      products.find((p) => p.slug?.includes("mongo") || p.name?.toLowerCase().includes("mongo")) ??
      products[0];
    if (!mongoProduct) {
      console.error("No MongoDB products found for config", atlas.id);
      return null;
    }

    const storeName = `omgitslive-${projectName}-${Date.now()}`.slice(0, 128);
    const { storeId, resourceId } = await createStore(
      vercelToken,
      storeName,
      atlas.id,
      mongoProduct.slug ?? mongoProduct.id
    );
    if (!storeId || !resourceId) return null;

    await connectStoreToProject(vercelToken, atlas.id, resourceId, vercelProjectId, [
      "MONGODB_URI",
      "DATABASE_URL",
    ]);

    return {
      success: true,
      envVars: [],
    };
  } catch (err) {
    console.error("MongoDB provision error:", err);
    return null;
  }
}

/**
 * Auto-provision database based on detected project needs.
 * Uses the user's own Vercel account — OMGItsLive owns nothing.
 */
export async function provisionDatabase(
  databaseType: string,
  vercelToken: string,
  projectName: string,
  vercelProjectId: string
): Promise<ProvisionOutcome> {
  if (databaseType === "mongodb") {
    return provisionMongoDB(vercelToken, projectName, vercelProjectId);
  }

  if (databaseType === "postgresql" || databaseType === "supabase") {
    return provisionPostgres(vercelToken, projectName, vercelProjectId);
  }

  return null;
}
