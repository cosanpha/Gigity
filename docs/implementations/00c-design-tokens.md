# 00c — Setup: Design Tokens & globals.css

## What this builds

Add the project's color and spacing tokens to `globals.css` as CSS custom properties.
These are extracted from the three design HTML files in `docs/designs/`.
Reference them when writing Tailwind utilities in components.

## Prerequisites

None (can be done in parallel with 00a/00b).

## Files to modify

```
src/app/globals.css   ← add :root design tokens
src/app/layout.tsx    ← add Inter-like font loading note (font stays Montserrat)
```

---

## Step 1 — Add design tokens to globals.css

Add these CSS custom properties to the `:root` block in `globals.css`.
Place them inside the existing `@layer base` or directly after `@import 'tailwindcss';`.

```css
/* Design tokens (from docs/designs/*.html) */
:root {
  --ds-bg: #ffffff;
  --ds-surface: #ffffff;
  --ds-surface-2: #f4f4f5; /* zinc-100 */
  --ds-border: #e4e4e7; /* zinc-200 */
  --ds-border-2: #d4d4d8; /* zinc-300 */
  --ds-text: #09090b; /* zinc-950 */
  --ds-text-2: #71717a; /* zinc-500 */
  --ds-text-3: #a1a1aa; /* zinc-400 */
  --ds-accent: #6366f1; /* indigo-500 */
  --ds-accent-h: #4f46e5; /* indigo-600 */
  --ds-success: #16a34a; /* green-600 */
  --ds-warning: #d97706; /* amber-600 */
  --ds-radius: 6px;
}
```

The `ds-` prefix avoids collisions with Tailwind's built-in CSS vars.

---

## Step 2 — Tailwind utility cheat-sheet

When writing JSX, use these Tailwind classes to match the design. Do not use
`var(--ds-*)` directly in className — use the Tailwind equivalents instead.

| Design role          | Tailwind class        | Hex       |
| -------------------- | --------------------- | --------- |
| Accent (button bg)   | `bg-indigo-500`       | `#6366f1` |
| Accent hover         | `hover:bg-indigo-600` | `#4f46e5` |
| Primary text         | `text-zinc-950`       | `#09090b` |
| Secondary text       | `text-zinc-500`       | `#71717a` |
| Tertiary text        | `text-zinc-400`       | `#a1a1aa` |
| Border (default)     | `border-zinc-200`     | `#e4e4e7` |
| Border (hover/focus) | `border-zinc-300`     | `#d4d4d8` |
| Surface / subtle bg  | `bg-zinc-100`         | `#f4f4f5` |
| Success text/dot     | `text-green-600`      | `#16a34a` |
| Warning text/dot     | `text-amber-600`      | `#d97706` |
| Border radius        | `rounded-[6px]`       | `6px`     |
| Nav height           | `h-[52px]`            | —         |
| Page max-width       | `max-w-[780px]`       | —         |

---

## Step 3 — Font note

The app uses Montserrat (headings) and Source Sans Pro (body), already configured
in `globals.css`. The design mockups use Inter — ignore this difference. Do NOT
change the fonts. All new components should rely on the existing font setup.

---

## Step 4 — Body base styles

Ensure `globals.css` has a base font size and line-height that matches the design
(14px body text):

```css
@layer base {
  body {
    font-size: 14px;
    line-height: 1.5;
    @apply bg-white text-zinc-950;
  }
}
```

If there's already a `body` base rule, merge these values in.

---

## Verify

```bash
bun dev
```

Open http://localhost:3000. The page renders. No CSS errors in the browser console.

---

**Output:** Design tokens documented in globals.css. Tailwind cheat-sheet ready to
reference when writing components.

**Next step:** [01a-brand-model.md](01a-brand-model.md) — BrandProfile Mongoose model

