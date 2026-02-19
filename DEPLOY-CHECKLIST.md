# OMGItsLive Deploy Checklist

Before deploying, verify:

## 1. GitHub OAuth App
- [ ] Go to https://github.com/settings/developers → OAuth Apps
- [ ] **Authorization callback URL** = `https://golive-nine.vercel.app/api/auth/callback/github` (exact)
- [ ] **Homepage URL** = `https://golive-nine.vercel.app`
- [ ] Copy Client ID and Client Secret

## 2. Vercel Environment Variables
Set in Project → Settings → Environment Variables:

| Variable | Example |
|----------|---------|
| `AUTH_GITHUB_ID` | From GitHub OAuth App |
| `AUTH_GITHUB_SECRET` | From GitHub OAuth App |
| `NEXTAUTH_URL` | `https://golive-nine.vercel.app` |
| `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32` |
| `NEXT_PUBLIC_VERCEL_APP_CLIENT_ID` | From Vercel App |
| `VERCEL_APP_CLIENT_SECRET` | From Vercel App |
| `DATABASE_URL` | PostgreSQL connection string |

## 3. After Deploy
- [ ] Visit https://golive-nine.vercel.app/api/debug — all "SET", db "OK"
- [ ] Try Sign in with GitHub
