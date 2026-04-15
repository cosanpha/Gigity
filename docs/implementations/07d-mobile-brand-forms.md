# 07d — Mobile: Brand Form + Brand Pages

**Milestone:** Mobile Responsive Pass  
**Depends on:** `06g` (BrandForm + brand pages already polished)  
**Scope:** Minor fixes for BrandForm field layout and brand page padding on small screens

---

## Context

Files to modify:

- `src/components/BrandForm.tsx`
- `src/app/brand/new/page.tsx`
- `src/app/brand/[id]/edit/page.tsx`

BrandForm is already `max-w-[640px]` centered — it will be full-width on mobile, which is correct. Most inputs stack naturally. These are small fixes only.

---

## 1. `BrandForm.tsx` — MODIFY

### 1a. Tone chip grid — allow wrap on mobile

The tone selection renders chip buttons in a flex row. Find:

```tsx
<div className="flex flex-wrap gap-2">
  {TONES.map(tone => (
    <button ...>{tone}</button>
  ))}
</div>
```

If it already uses `flex-wrap`, it's fine — no change needed.

If it uses `flex` without `flex-wrap`, add `flex-wrap`:

```tsx
<div className="flex flex-wrap gap-2">
```

### 1b. Platform chip grid — same check

Same pattern as tones. Verify `flex-wrap` is on the platforms div. Add it if missing.

### 1c. Example video URLs + brand links inputs

These use `PasteOnlyUrlInput` components stacked vertically. Should already stack correctly. No change needed.

### 1d. Save button — full width on mobile

The save button is currently inline. On mobile, make it full-width:

Find the submit button (near end of form):

```tsx
<button
  type="submit"
  disabled={saving}
  className="inline-flex items-center gap-2 rounded-[7px] bg-orange-500 px-[18px] py-[9px] text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
>
```

Replace with:

```tsx
<button
  type="submit"
  disabled={saving}
  className="inline-flex w-full items-center justify-center gap-2 rounded-[7px] bg-orange-500 px-[18px] py-[9px] text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:justify-start"
>
```

Key changes:

- `w-full` on mobile, `sm:w-auto` on larger screens
- `justify-center` on mobile (centers text in full-width button), `sm:justify-start` on larger

### 1e. Logo URL field layout

The logo field has a Cloudinary upload button + paste URL input side by side. On mobile this may be very cramped.

Find the logo field area. If it has `flex items-center gap-3`, change to:

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
```

This stacks the upload button above the URL input on mobile, side-by-side on `sm:`.

---

## 2. `src/app/brand/new/page.tsx` — MODIFY

### 2a. Back link + page heading area

The current structure:

```tsx
<div className="mb-6 flex items-center gap-3">
  <Link href="/" ...>← Back</Link>
</div>
<h1 className="mb-1 text-[20px] font-bold ...">Set up your brand</h1>
<p className="mb-8 text-[13px] ...">This context is used to pre-fill...</p>
```

No changes needed — all these stack naturally at mobile widths.

### 2b. Horizontal padding on mobile

The `<main>` has `px-6` (24px each side). At 375px this leaves 327px content width — fine. No change.

---

## 3. `src/app/brand/[id]/edit/page.tsx` — MODIFY

### 3a. Title + delete button row

The heading area:

```tsx
<div className="mb-8 flex items-center gap-3">
  <div>
    <h1>Edit brand</h1>
    <p>...</p>
  </div>
</div>
```

No change needed — single column layout already.

### 3b. Delete button — full width on mobile

Find the delete brand `<button>`:

```tsx
<button
  type="button"
  onClick={...}
  className="inline-flex items-center gap-2 rounded-[6px] border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 ..."
>
```

Add `w-full sm:w-auto justify-center sm:justify-start`:

```tsx
<button
  type="button"
  onClick={() => {
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }}
  disabled={saving}
  className="inline-flex w-full items-center justify-center gap-2 rounded-[6px] border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:justify-start"
>
```

---

## Verification

```bash
bunx tsc --noEmit
```

Visual check at 375px on `/brand/new` and `/brand/[id]/edit`:

- Form fields fill full width
- Tone chips wrap naturally across multiple rows
- Save button is full-width
- Logo field: upload button stacked above URL input
- Delete button: full-width
- No horizontal scroll

