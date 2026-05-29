# @aura/ui

Shared React components used across `apps/shop` and `apps/engine`.

## When to add a component here

**Before you copy a component from one app to another, put it here instead.** The whole point of this package is to prevent drift — two copies of a Navbar/Footer/Disclaimer that slowly diverge until brand updates take twice as long and break in subtle ways.

## How to use it from an app

1. Add the dep to the app's `package.json`:
   ```json
   "@aura/ui": "workspace:*"
   ```
2. `pnpm install` from the monorepo root.
3. Import:
   ```ts
   import { Disclaimer } from "@aura/ui";
   ```

## Scope

Truly cross-app primitives only. App-specific surface (e.g., shop's `ProductCard`, engine's `RecommendationCard`) stays in its app.
