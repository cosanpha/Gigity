# 06g — UI Redesign: BrandForm + Brand Pages Polish

**Milestone:** UI Redesign Pass A  
**Depends on:** `06a` (SectionHeader must exist)  
**Scope:** Use SectionHeader in BrandForm, polish brand page headings and danger zone label

---

## Context

Files to modify:
- `src/components/BrandForm.tsx`
- `src/app/brand/new/page.tsx`
- `src/app/brand/[id]/edit/page.tsx`

Design reference: `docs/designs/brand.html`

Changes are purely visual.

---

## 1. `src/components/BrandForm.tsx` — MODIFY

### 1a. Add SectionHeader import

```tsx
import { SectionHeader } from '@/components/ui/SectionHeader'
```

### 1b. Form card container — add rounder corners + soft shadow

Find the form's outer wrapper div (the card-like container). It likely has:
```tsx
<div className="rounded-[8px] border border-zinc-200 ...">
```

Update to:
```tsx
<div className="rounded-[10px] border border-zinc-200 shadow-sm ...">
```

### 1c. Replace section `<p>` labels with `<SectionHeader>`

The BrandForm has 4 sections separated by labels. Current pattern:
```tsx
<p className="mb-3 text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
  Brand identity
</p>
```

Replace each with `<SectionHeader>`:

**Section 1 — Brand identity:**
```tsx
<SectionHeader label="Brand identity" />
```

**Section 2 — Voice & tone:**
```tsx
<SectionHeader label="Voice & tone" />
```

**Section 3 — Platforms:**
```tsx
<SectionHeader label="Platforms" />
```

**Section 4 — References (or Examples):**
```tsx
<SectionHeader label="References" />
```

> Match the exact label text to what the current form uses. Check the file to confirm exact strings.

### 1d. Field labels — make bolder

Find all form field `<label>` elements inside BrandForm:
```tsx
<label className="... font-medium ...">
```

Change `font-medium` → `font-semibold` on each one.

### 1e. Save button — match dashboard button style

Find the submit/save button:
```tsx
<button type="submit" ... className="... rounded-[6px] ...">
```

Update to:
```tsx
className="inline-flex items-center gap-2 rounded-[7px] bg-orange-500 px-[18px] py-[9px] text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
```

---

## 2. `src/app/brand/new/page.tsx` — MODIFY

### 2a. Page heading

Find:
```tsx
<h1 className="mb-1 text-[20px] font-bold tracking-tight text-zinc-950">
  Set up your brand
</h1>
```

This is already correct. No change needed.

### 2b. Subtitle

Find:
```tsx
<p className="mb-8 text-[13px] text-zinc-500">
  This context is used to pre-fill every step of the video workflow.
</p>
```

No change needed.

---

## 3. `src/app/brand/[id]/edit/page.tsx` — MODIFY

### 3a. Page heading

Find:
```tsx
<h1 className="mb-1 text-[20px] font-bold tracking-tight text-zinc-950">
  Edit brand
</h1>
```

Already correct. No change needed.

### 3b. Danger zone label

Find the danger zone section header. Current:
```tsx
<h2 className="mb-1 text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
  Danger zone
</h2>
```

Replace with `<SectionHeader>`:
```tsx
<SectionHeader label="Danger zone" />
```

> Add `import { SectionHeader } from '@/components/ui/SectionHeader'` at the top of the file if not already present.

---

## Verification

```bash
bunx tsc --noEmit
```

Expected: zero errors.

Visual check on `/brand/new` and `/brand/[id]/edit`:
- Form sections have consistent dividers matching dashboard list sections
- Field labels are `font-semibold` (slightly bolder than before)
- Save button matches the orange `New video` button style
- Danger zone uses SectionHeader (line + label) instead of a plain `<h2>`
