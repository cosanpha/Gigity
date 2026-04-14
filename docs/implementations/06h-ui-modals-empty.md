# 06h — UI Redesign: NewVideoModal + EmptyState

**Milestone:** UI Redesign Pass A  
**Depends on:** `06e` (framer-motion must be installed)  
**Scope:** Animate NewVideoModal open/close; polish EmptyState card

---

## Context

Files to modify:
- `src/components/NewVideoModal.tsx` — "New video" dialog
- `src/components/EmptyState.tsx` — empty dashboard state card

Design reference: `docs/designs/dashboard.html` (modal and empty state sections).

---

## 1. `src/components/NewVideoModal.tsx` — MODIFY

### 1a. Add framer-motion imports

At the top:
```tsx
import { AnimatePresence, motion } from 'framer-motion'
```

### 1b. Trigger button — match design system

Find the trigger `<button>`:
```tsx
<button
  onClick={openModal}
  className="inline-flex items-center gap-2 rounded-[6px] bg-orange-500 px-[18px] py-2 text-sm font-medium text-white ..."
>
```

Replace with:
```tsx
<button
  onClick={openModal}
  className="inline-flex items-center gap-2 rounded-[7px] bg-orange-500 px-[18px] py-[9px] text-[13.5px] font-semibold text-white transition-colors hover:bg-orange-600 shadow-sm"
>
  <LucidePlus className="h-4 w-4" aria-hidden />
  New video
</button>
```

### 1c. Wrap modal in AnimatePresence

Replace the current conditional render of the modal with `<AnimatePresence>` + animated backdrop + animated card:

```tsx
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && closeModal()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-md rounded-[12px] border border-zinc-200 bg-white p-6 shadow-xl"
      >
        {/* ... modal content unchanged ... */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

Key changes vs old:
- Backdrop now has `backdrop-blur-sm` — softens the content behind the overlay
- Backdrop fades in (`opacity: 0 → 1`) separately from the card
- Card scales from `0.96 → 1` and slides up `y: 8 → 0` — feels like a native dialog appearing
- On exit, both backdrop and card animate out

### 1d. Card shape

Card container class should be:
```
rounded-[12px] border border-zinc-200 bg-white p-6 shadow-xl
```

(12px radius, `shadow-xl` for depth — matches a proper modal floating above the page.)

---

## 2. `src/components/EmptyState.tsx` — MODIFY

### 2a. Container — rounder + softer background

Find the root div:
```tsx
<div className="flex flex-col items-center rounded-[8px] border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center">
```

Replace with:
```tsx
<div className="flex flex-col items-center rounded-[10px] border border-dashed border-zinc-300 bg-zinc-50/60 py-16 text-center">
```

Changes:
- `rounded-[8px]` → `rounded-[10px]` — matches VideoCard corner radius
- `bg-zinc-50` → `bg-zinc-50/60` — slightly more transparent, less heavy

No other changes to EmptyState — icon, heading, copy, and button are already correct.

---

## Verification

```bash
bunx tsc --noEmit
```

Expected: zero errors.

Visual check:
1. Open dashboard → click "New video"
   - Modal backdrop fades in with blur
   - Card scales in from slightly small (scale 0.96)
   - Close the modal — card scales back out and backdrop fades
2. With no projects, EmptyState should show with rounded-[10px] dashed border card
3. "New video" button (both in header and in EmptyState) should be `rounded-[7px] font-semibold shadow-sm`
