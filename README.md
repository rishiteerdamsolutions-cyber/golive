# OMGItsLive — You built it with AI. We make it live.

Deploy your Cursor-built app in 60 seconds. No Git, no DevOps, no confusion.

## How It Works

1. User picks their project folder (or uploads a zip)
2. Connects GitHub (one-click OAuth)
3. Connects Vercel (one-click OAuth)
4. Clicks Deploy
5. OMGItsLive automatically:
   - Creates a GitHub repo in the **user's own GitHub**
   - Pushes code
   - Detects if a database is needed (Prisma → PostgreSQL, Mongoose → MongoDB)
   - Provisions database via **user's own Vercel marketplace integrations** (Neon, MongoDB Atlas)
   - Injects env vars (`DATABASE_URL`, etc.)
   - Deploys to **user's own Vercel**

**Everything runs in the user's own accounts. OMGItsLive owns nothing.**

## Setup (for OMGItsLive developers)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env` and fill in:
   - `DATABASE_URL` - SQLite: `file:./dev.db` (OMGItsLive's own local DB for tracking deployments)
   - `NEXTAUTH_URL` - Your app URL (e.g. `http://localhost:3000`)
   - `NEXTAUTH_SECRET` - Random string for session encryption
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` - From [GitHub OAuth Apps](https://github.com/settings/developers)
   - `NEXT_PUBLIC_VERCEL_APP_CLIENT_ID` / `VERCEL_APP_CLIENT_SECRET` - Create app at [Vercel Dashboard](https://vercel.com/dashboard) → Integrations → OAuth

   That's it. No database API keys needed — databases are provisioned in each user's own account.

3. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```

## Database Provisioning

When OMGItsLive detects a project needs a database:

| Detected Dependency | Database Type | Provisioned Via |
|---|---|---|
| Prisma, Drizzle | PostgreSQL | Neon (user's Vercel marketplace integration) |
| Mongoose, mongodb | MongoDB | MongoDB Atlas (user's Vercel marketplace integration) |

If the user hasn't installed the required integration on their Vercel account, OMGItsLive shows a one-click link to install it (free tier).

## Requirements for End Users

- **GitHub account** — for code storage (connected via OAuth)
- **Vercel account** — for hosting + database (connected via OAuth)
- **Neon integration on Vercel** — only if project uses PostgreSQL (free, one-click install)
- **MongoDB Atlas integration on Vercel** — only if project uses MongoDB (free, one-click install)

## Free Tier

- 1 successful deployment per user
- Upgrade to Pro for unlimited (Stripe integration can be added)
