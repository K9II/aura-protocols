# Deploy

Each app is its own Vercel project. The monorepo root holds shared install/build via pnpm + Turborepo; each Vercel project's **Root Directory** points at the app folder.

## Vercel project setup

| App | Vercel Root Directory | Domain | Runtime |
|---|---|---|---|
| `apps/shop` | `apps/shop` | shop.auraprotocols.com | Static export |
| `apps/engine` | `apps/engine` | auraprotocols.com | Node SSR |

For each project in the Vercel dashboard: **Settings → General → Root Directory** = the path above. `vercel.json` inside each app pins the install/build command so it works regardless of dashboard inference.

## Required env vars

**`apps/shop`** — none.

**`apps/engine`** — set these in Vercel project env:

| Var | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server auth |
| `SUPABASE_SERVICE_ROLE_KEY` | admin queries |
| `ANTHROPIC_API_KEY` | LLM recommendations |
| `TERRA_DEV_ID` | wearable API |
| `TERRA_API_KEY` | wearable API |
| `TERRA_SIGNING_SECRET` | webhook verification |

Without these, engine routes `/connect`, `/upload`, `/onboarding`, `/recommendation` will 500. Only `/demo` works without env (hardcoded data).

## Adding a third app

1. Create `apps/<name>/` with its own `package.json` and `vercel.json` (copy from `apps/engine/vercel.json`, swap the filter).
2. Add a new Vercel project pointing at `apps/<name>`.
3. Set env vars in dashboard.
4. Update this file.
