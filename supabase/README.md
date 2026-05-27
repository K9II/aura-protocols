# Supabase migrations

Run via Supabase dashboard SQL editor (paste each file in order) or `supabase db push` once the Supabase CLI is wired.

Apply order:
1. `0001_init.sql`
2. `0002_rls.sql`

After applying, set the env vars listed in `.env.local.example` from the Supabase project Settings → API page.
