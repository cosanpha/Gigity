# 07a — Mobile: Navbar

**Milestone:** Mobile Responsive Pass  
**Depends on:** `06b` (Navbar already updated)  
**Scope:** Make Navbar responsive — prevent overflow on small screens, compress right-side buttons

---

## Context

File to modify: `src/components/Navbar.tsx`

The navbar has two sides:
- **Left:** logo + "Gigity" text + optional separator + brand badge or brand switcher
- **Right:** "Edit brand" link + "New brand" link

At 375px, both sides together are ~360px wide. With a 40px padding (`px-5` = 20px each side), there's ~335px of usable space. The right side alone with two links can be ~200px. This gets very tight.

---

## Changes

### 1. Shorten right-side buttons on small screens

Find the `<div className="flex items-center gap-1.5">` on the right side.

The "Edit brand" link should show icon-only on small screens. The "New brand" link should show icon-only on small screens.

**"Edit brand" link** — add icon + hide text on small screens:

```tsx
{brandId && (
  <Link
    href={`/brand/${brandId}/edit`}
    className="inline-flex items-center gap-1.5 rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] font-medium text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
    aria-label="Edit brand"
  >
    <LucidePencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
    <span className="hidden sm:inline">Edit brand</span>
  </Link>
)}
```

Add `import { LucidePencil, LucidePlus } from 'lucide-react'` at the top (replace `LucidePlus` if already imported — merge into one import).

**"New brand" link** — hide text on small screens:

```tsx
{!showSwitcher && (
  <Link
    href="/brand/new"
    className="inline-flex items-center gap-1.5 rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] font-medium text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
    aria-label="New brand"
  >
    <LucidePlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
    <span className="hidden sm:inline">New brand</span>
  </Link>
)}
```

### 2. Truncate long brand names

The brand badge pill can hold a long name that overflows. Add truncation:

Find:
```tsx
<span className="inline-flex items-center gap-[5px] rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[12px] font-semibold text-zinc-600">
  <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-orange-400" />
  {brandName}
</span>
```

Replace with:
```tsx
<span className="inline-flex max-w-[140px] items-center gap-[5px] rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[12px] font-semibold text-zinc-600 sm:max-w-none">
  <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-orange-400" />
  <span className="truncate">{brandName}</span>
</span>
```

### 3. Left side min-width protection

The left div already has `min-w-0` — keep it. No change needed.

---

## Result

- At 375px: shows logo + "Gigity" + brand badge (truncated to 140px) + icon-only buttons on right
- At 640px+: shows full text on buttons
- At all sizes: no overflow, no horizontal scroll

---

## Verification

```bash
bunx tsc --noEmit
```

Visual check at 375px width (Chrome DevTools):
- No horizontal scroll
- Logo + brand badge visible
- Right side shows pencil icon + plus icon (no text overflow)
