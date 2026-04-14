# 06b — UI Redesign: Navbar + VideoCard

**Milestone:** UI Redesign Pass A  
**Depends on:** `06a` (StatusBadge must exist)  
**Scope:** Polish Navbar appearance, update VideoCard to use StatusBadge + new card styles

---

## Context

Design reference: `docs/designs/dashboard.html` (navbar and video list sections).

Changes are purely visual — no prop changes, no API calls affected.

---

## 1. `src/components/Navbar.tsx` — MODIFY

**Current file location:** `src/components/Navbar.tsx`

Apply these changes:

### 1a. Nav `<nav>` element — improve backdrop blur + z-index

Find:

```tsx
<nav className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-zinc-200 bg-white px-5">
```

Replace with:

```tsx
<nav className="sticky top-0 z-40 flex h-[52px] items-center justify-between border-b border-zinc-200 bg-white/92 px-5 backdrop-blur-md">
```

### 1b. Logo image — add shadow + rounder corners

Find:

```tsx
className =
  'h-[28px] w-[28px] rounded-[6px] shadow-[0_1px_4px_rgba(249,115,22,0.25)]'
```

If not already present, add `shadow-[0_1px_4px_rgba(249,115,22,0.25)]` and change to `rounded-[7px]`.

Full updated image:

```tsx
<Image
  src="/logo.png"
  width={28}
  height={28}
  alt="Gigity Logo"
  className="h-[28px] w-[28px] rounded-[7px] shadow-[0_1px_4px_rgba(249,115,22,0.25)]"
/>
```

### 1c. Logo link text — bolder + tighter gap

Find the logo link. Change `gap-2` → `gap-2.5`, `font-semibold` → `font-bold`:

```tsx
<Link
  href={brandId ? `/?brand=${encodeURIComponent(brandId)}` : '/'}
  className="flex shrink-0 items-center gap-2.5 text-[15px] font-bold tracking-tight text-zinc-950"
>
```

### 1d. Separator — taller

Find `<span className="h-4 w-px bg-zinc-200" />` and change to `h-[18px]`:

```tsx
{
  ;(showSwitcher || brandName) && <span className="h-[18px] w-px bg-zinc-200" />
}
```

### 1e. Brand badge — add orange dot + bolder text

Find the brand badge span (the non-switcher `brandName` render). Replace:

```tsx
brandName && (
  <span className="inline-flex items-center gap-[5px] rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[12px] font-semibold text-zinc-600">
    <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-orange-400" />
    {brandName}
  </span>
)
```

---

## 2. `src/components/VideoCard.tsx` — MODIFY

**Current file location:** `src/components/VideoCard.tsx`

### 2a. Import StatusBadge

Add at the top with other imports:

```tsx
import { StatusBadge } from './ui/StatusBadge'
import { StepProgressBar } from './StepProgressBar'
```

### 2b. Remove the local StatusBadge function

At the bottom of the file there is a local `function StatusBadge(...)` definition.
**Delete the entire function** — it's now imported from `./ui/StatusBadge`.

### 2c. Card container — rounder + softer hover

Find the root div:

```tsx
<div className="group relative flex items-center justify-between rounded-[6px] border border-zinc-200 bg-white px-5 py-[14px] transition-all hover:border-zinc-300 hover:bg-zinc-50">
```

Replace with:

```tsx
<div className="group relative flex items-center justify-between rounded-[10px] border border-zinc-200 bg-white px-4 py-[13px] transition-all hover:border-zinc-300 hover:bg-zinc-50/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
```

### 2d. Add in-progress accent stripe

Add immediately after the opening `<div>` (before the `<Link>`):

```tsx
{
  listStatus === 'in_progress' && (
    <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-[2px] bg-orange-300/70" />
  )
}
```

### 2e. Link — add left padding

Find `className="flex min-w-0 flex-1 flex-col gap-1"` on the `<Link>` and add `pl-1`:

```tsx
className = 'flex min-w-0 flex-1 flex-col gap-1 pl-1'
```

### 2f. Title — bolder + slightly smaller

Find the title span:

```tsx
<span className="truncate text-[14px] font-medium text-zinc-950">
```

Replace with:

```tsx
<span className="truncate text-[13.5px] font-semibold text-zinc-950">
```

### 2g. Right div — tighter gap

Find `className="ml-5 flex shrink-0 items-center gap-4"` and change to `ml-4 gap-3`:

```tsx
<div className="ml-4 flex shrink-0 items-center gap-3">
```

---

## Verification

```bash
bunx tsc --noEmit
```

Expected: zero errors (or only the framer-motion error from `MotionLayout.tsx`).

Visual check: the VideoCard should have:

- Rounder corners
- Orange left accent stripe when in-progress
- StatusBadge imported from shared component (not local function)

