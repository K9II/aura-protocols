# Supabase migrations

## Apply order
1. `migrations/0001_init.sql`
2. `migrations/0002_rls.sql`
3. `migrations/0003_user_profiles.sql`

Originally applied via the Supabase dashboard SQL editor. CLI now wired via `config.toml` (project ref `skphqhsuqafbjdlwngjl`).

## Drift check (run from `apps/engine/`)

```bash
npx supabase link --project-ref skphqhsuqafbjdlwngjl  # prompts for DB password
npx supabase db diff --schema public                  # empty output = repo matches prod
```

If `db diff` returns SQL, the dashboard has changes not in the repo. Decide per change:
- Promote to a new migration file: `npx supabase db diff -f NNNN_description`
- Or revert in the dashboard if it was an accident

## Adding a new migration

```bash
npx supabase migration new <short_name>   # creates migrations/<timestamp>_<short_name>.sql
# edit the file
npx supabase db push                       # applies to linked remote
```

After applying, set the env vars in `apps/engine/.env.local` from Settings → API.
