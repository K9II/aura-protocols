# Engine Deploy Notes

## Vercel
1. Create a new Vercel project. Import the `engine/` repo (separate from `shop.auraprotocols.com`).
2. Framework preset: Next.js. Build/output: defaults.
3. Add env vars from `.env.local.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TERRA_DEV_ID`, `TERRA_API_KEY`, `TERRA_SIGNING_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_BASE_URL=https://auraprotocols.com`
4. Add custom domain `auraprotocols.com` → Settings → Domains.
5. Point DNS apex A/AAAA records at Vercel as instructed.

## Supabase
1. Create a new Supabase project (free tier).
2. Apply `supabase/migrations/0001_init.sql` then `0002_rls.sql` via SQL editor.
3. Authentication → URL Configuration: Site URL `https://auraprotocols.com`, redirect URLs `https://auraprotocols.com/auth/callback` and `http://localhost:3000/auth/callback`.
4. Authentication → Providers: Email (magic link on by default).

## Terra
1. Sign up at tryterra.co. Dev tier free months 1–2.
2. Set webhook URL to `https://auraprotocols.com/api/terra/webhook`.
3. Copy `dev_id`, `x_api_key`, signing secret into Vercel env vars.
4. Enable providers: WHOOP, OURA, APPLE, GARMIN, FITBIT, DEXCOM.

## Anthropic
1. Create API key at console.anthropic.com.
2. Set `ANTHROPIC_API_KEY` in Vercel. Prompt caching keeps spend under $50/mo.

## Smoke test after deploy
1. `https://auraprotocols.com/` — landing renders.
2. `/connect` — sign-in form renders.
3. Sign in via magic link → redirect to `/connect`.
4. "Connect a wearable" → Terra widget opens.
5. Connect wearable (or Terra Sandbox) → land on `/recommendation`.
6. "Generate my protocol" → card with disclaimer, prescribe CTA, feedback widget.
7. Submit thumbs-up and thumbs-down → confirm rows in Supabase `recommendation_feedback`.
