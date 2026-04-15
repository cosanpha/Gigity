# 07e — Mobile: NewVideoModal + EmptyState

**Milestone:** Mobile Responsive Pass  
**Depends on:** `06h` (NewVideoModal already has AnimatePresence)  
**Scope:** NewVideoModal needs scroll + max-height on tall content; EmptyState text needs padding check

---

## Context

Files to modify:
- `src/components/NewVideoModal.tsx`
- `src/components/EmptyState.tsx`

NewVideoModal is already `w-full max-w-md` — it will be full-width minus padding on mobile. The issue is that on short mobile viewports (iPhone SE = 667px, notch phones with keyboard open = ~400px visible), the modal can get taller than the screen.

---

## 1. `NewVideoModal.tsx` — MODIFY

### 1a. Modal card — add max-height + scroll

Find the inner card `motion.div`:
```tsx
<motion.div
  ...
  className="w-full max-w-md rounded-[12px] border border-zinc-200 bg-white p-6 shadow-xl"
>
```

Replace with:
```tsx
<motion.div
  ...
  className="w-full max-w-md rounded-[12px] border border-zinc-200 bg-white p-6 shadow-xl max-h-[90dvh] overflow-y-auto"
>
```

Key additions:
- `max-h-[90dvh]` — caps height at 90% of the dynamic viewport height (accounts for mobile browser chrome + keyboard)
- `overflow-y-auto` — scrolls within the card if content overflows

### 1b. Backdrop padding — less on mobile

Find the backdrop `motion.div`:
```tsx
className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
```

Replace with:
```tsx
className="fixed inset-0 z-50 flex items-center justify-end pb-4 px-4 pt-4 sm:items-center bg-black/30 backdrop-blur-sm"
```

On mobile (`items-end`), the modal anchors to the bottom of the screen — feels more native and gives keyboard more room. On `sm:` it centers as before.

> Optional: if anchoring to bottom feels too different from the desktop center, keep `items-center` on all sizes and just rely on `max-h-[90dvh]`. Simpler. Your call.

### 1c. Simplified version (skip 1b if preferred)

If you prefer to keep the modal centered at all sizes, just add `max-h-[90dvh] overflow-y-auto` to the card (step 1a only) and skip 1b. This is correct and sufficient for most use cases.

---

## 2. `EmptyState.tsx` — MODIFY

### 2a. Padding check

Find the root div:
```tsx
<div className="flex flex-col items-center rounded-[10px] border border-dashed border-zinc-300 bg-zinc-50/60 py-16 text-center">
```

`py-16` is 64px top/bottom — very generous. On mobile this is fine since EmptyState is inside the `PageLayout` which has `px-6`. No change needed.

### 2b. Text max-width on mobile

Find:
```tsx
<p className="mx-auto mt-1.5 mb-5 max-w-[300px] text-[13px] text-zinc-500">
```

`max-w-[300px]` is fine at 375px (300px < 327px usable). No change.

---

## 3. `DashboardProjectList.tsx` — "New video" button on mobile

The `<NewVideoModal>` trigger button appears in two places:
1. Page header (top right of dashboard) — from `src/app/page.tsx`
2. Inside `EmptyState` — from `src/components/EmptyState.tsx`

Both render the same button: `rounded-[7px] bg-orange-500 ...`. Both are fine at mobile widths. No change.

---

## Verification

```bash
bunx tsc --noEmit
```

Visual check at 375px:
1. Open "New video" modal
2. On an iPhone SE (667px height) or with keyboard open — modal should not overflow the screen
3. If content is taller than `90dvh`, the card should be scrollable internally
4. Modal still closes when tapping outside (backdrop click handler unchanged)

Check at 844px (iPhone 14):
- Modal should center normally, no clipping
