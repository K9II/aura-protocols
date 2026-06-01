# Aura — Brand Mark System

One idea, ownable and reducible: **the vital sign is the letter.** A kinetic,
forward-leaning **A** whose crossbar is a flow-through **ECG pulse**. The pulse
beats and then draws the sub-brand glyph, so the symbol doubles as the wordmark's
initials.

## The family
| Brand | Symbol | Glyph drawn by the pulse |
|---|---|---|
| **Aura Protocols** (shop) | A + pulse → **p** | stem + bowl (closed ring) |
| **Aura Clinical** (clinic) | A + pulse → **c** | open concentric "aura" rings — **DRAFT, pending design pass** |

The symbol-as-letters lockup: **A** is the "A" of *Aura* with **"ura" stacked beneath it**;
the pulse-drawn glyph is the first letter of the second word, with the rest of the
word (**"rotocols"** / **"linical"**) running horizontally after it.

## Color
- **Expressive (primary):** brand gradient `#00d4ff → #8b5cf6` (cyan → violet), 135°.
- **Solid:** single flat color for small/print/embroidery. Favicon uses **white on `#0d1117`**.
- Never put the gradient on a white background.

## Type
- **Display / wordmark:** Space Grotesk (600), `--font-display`.
- **Body:** Inter, `--font-sans`.

## Sizing & legibility
- The full lockup (stacked "ura") is a **large-format** treatment (hero, brand cards, print).
- In tight UI (navbar, ≤40px), use the **mark + horizontal wordmark**, not the stacked lockup.
- At **≤16px** (favicon) the glyph is dropped — **A + pulse only** — for legibility.

## Motion
- Pure CSS on inline SVG (`globals.css`): the pulse **draws on**, the bowl/stem completes,
  a **comet** races the path and lands in a **spark**.
- **Hero:** draw once on load → calm breathing glow → comet replays on hover.
- **Navbar:** draw once on load, then rest.
- Always gated behind `prefers-reduced-motion: reduce` → static completed mark.

## Assets
| File | Use |
|---|---|
| `apps/shop/src/components/AuraMark.tsx` | In-app icon (loop / once / static) |
| `apps/shop/src/components/AuraLockup.tsx` | In-app full lockup |
| `apps/shop/src/app/icon.svg` | Favicon (simplified, white on dark) |
| `apps/shop/src/app/apple-icon.tsx` | iOS icon (generated) |
| `public/brand/aura-protocols-mark.svg` | Static mark, gradient |
| `public/brand/aura-protocols-mark-mono.svg` | Static mark, `currentColor` |
| `public/brand/aura-protocols-lockup.svg` | Static full lockup |
| `public/brand/aura-clinical-mark-DRAFT.svg` | Clinical mark — **draft, do not ship** |

> Standalone lockup SVGs reference Space Grotesk by name. **Outline the text to
> paths** before sending to any third party who won't have the font.

## Geometry (source of truth — port verbatim, do not freestyle)
Mark group: `transform="translate(6,4) skewX(-7)"`, round caps, miter joins (limit 9).
- A legs (stroke 14): `M30,128 L70,20` · `M70,20 L110,128`
- Aura echo ring (stroke 3.5, opacity .26): `M124,46 A26,26 0 1 1 124,98`
- Pulse → p (stroke 6): `M34,110 L46,86 L58,86 L64,68 L70,108 L76,86 L92,86 L106,86 L118,87 L124,90 A19,19 0 1 0 124,52 L124,116`
- Favicon pulse (no glyph, stroke 7–8): `M36,108 L48,86 L60,86 L66,68 L72,108 L78,86 L98,86 L112,72`
