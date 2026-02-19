# GitHub OAuth Setup for OMGItsLive

If GitHub sign-in shows "Configuration" or server error, verify these settings.

## 1. Create GitHub OAuth App

1. Go to **https://github.com/settings/developers**
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - **Application name**: OMGItsLive (or any name)
   - **Homepage URL**: `https://golive-nine.vercel.app`
   - **Authorization callback URL**: `https://golive-nine.vercel.app/api/auth/callback/github` ← must match exactly
4. Click **Register application**
5. Copy **Client ID** and generate **Client Secret**

## 2. Vercel Environment Variables

In your Vercel project → Settings → Environment Variables, set:

| Variable | Value |
|----------|-------|
| `AUTH_GITHUB_ID` | Your GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | Your GitHub OAuth Client Secret |
| `NEXTAUTH_URL` | `https://golive-nine.vercel.app` |
| `NEXTAUTH_SECRET` | Random string (e.g. `openssl rand -base64 32`) |
| `DATABASE_URL` | Your PostgreSQL connection string |

## 3. Verify

1. Redeploy after changing env vars
2. Visit **https://golive-nine.vercel.app/api/debug** — all should show "SET", db should show "OK"
3. Try sign-in again

## Common Issues

- **Configuration error**: Callback URL in GitHub must be exactly `https://golive-nine.vercel.app/api/auth/callback/github` (no trailing slash)
- **Server error / db FAILED**: DATABASE_URL wrong or database unreachable
- **AccessDenied**: User cancelled or GitHub returned an error
