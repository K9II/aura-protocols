@AGENTS.md

# Aura Protocols — Project Context

## What This Is
A Next.js 16 affiliate site for research peptides. Monetized via affiliate links to vendors (Peptide Sciences, Core Peptides, Limitless Life Nootropics, Swiss Chems, Behemoth Labz, Blue Sky Peptides). All affiliate links must include `rel="noopener noreferrer sponsored"`.

Live at: **https://shop.auraprotocols.com** (deployed on Vercel)

## Stack
- Next.js 16 (App Router, static export)
- Tailwind CSS v4
- TypeScript
- Google Fonts via `next/font/google`

## Design System
- **Theme**: Dark mode only. Background `#04060f`, surfaces `#0d1117` / `#161b22`
- **Primary colors**: Cyan `#00d4ff` + Violet `#8b5cf6`
- **Category colors**: Recovery=emerald, Weight Management=rose, Growth & Performance=violet, Wellness=cyan
- **Fonts**: Syne (`--font-display`) for headings, Inter (`--font-sans`) for body
- **Key CSS classes**: `.glass`, `.gradient-brand`, `.glow-cyan`, `.glow-violet`, `.btn-primary`, `.btn-outline`, `.badge`, `.product-card`, `.font-display`
- Never use generic fonts (Arial, Roboto, system-ui as primary). Never use purple gradients on white backgrounds.

## File Structure
```
src/
  app/
    page.tsx          # Homepage (7 sections)
    layout.tsx        # Root layout — fonts, metadata, BASE_URL
    globals.css       # Design tokens + utility classes
    about/page.tsx
    blog/[slug]/page.tsx
    compare/[slug]/page.tsx
    privacy/page.tsx
    terms/page.tsx
    products/[slug]/page.tsx
    sitemap.ts        # Dynamic sitemap — BASE_URL = shop.auraprotocols.com
    robots.ts
  components/
    Navbar.tsx        # Sticky glass nav — do not add legal links here
    Footer.tsx        # 3-col + legal row (Privacy Policy, Terms of Service)
    ProductCard.tsx   # Do not modify without explicit instruction
  data/
    products.ts       # 6 products, 4 featured
    posts.ts          # 6 blog posts
    comparisons.ts    # Vendor comparison pages
```

## Conventions
- `BASE_URL` is defined per-file in `sitemap.ts`, `robots.ts`, and `layout.tsx` — keep all three in sync
- Static pages follow the About page layout pattern: `max-w-3xl mx-auto px-6 py-16`, eyebrow + h1 + prose sections
- Section headers use `font-display text-4xl font-bold text-white`
- Do not modify `ProductCard`, `Navbar`, or data files unless explicitly asked
- All new static pages must be added to `sitemap.ts`
- Legal pages (`/privacy`, `/terms`) are linked in the Footer only, not the Navbar

## SEO
- `metadataBase` and canonical URLs use `https://shop.auraprotocols.com`
- Google Search Console verified — sitemap submitted
- JSON-LD structured data on product, blog, and comparison pages
