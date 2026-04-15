# 07b — Mobile: Dashboard Page

**Milestone:** Mobile Responsive Pass  
**Depends on:** `06c` (DashboardProjectList already updated with pill tabs)  
**Scope:** Make dashboard filter bar, VideoCard, and EmptyState responsive

---

## Context

Files to modify:
- `src/components/DashboardProjectList.tsx`
- `src/components/VideoCard.tsx`

The dashboard page itself (`src/app/page.tsx`) uses `PageLayout` with `max-w-[820px]` and `px-6`. On mobile, `px-6` (24px each side) is fine — no change needed there.

---

## 1. `DashboardProjectList.tsx` — Filter bar mobile layout

### 1a. Stack filter tabs and search vertically on small screens

Find the filter bar `<div className="mb-4 flex items-center gap-2">`:

```tsx
{/* Filter bar */}
<div className="mb-4 flex items-center gap-2">
```

Replace with:
```tsx
{/* Filter bar */}
<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
```

This stacks the pill group and the search input vertically on mobile, side-by-side on `sm:` (640px+).

### 1b. Search input — full width on mobile

Find the search input wrapper:
```tsx
<div className="flex-1" />
<input
  type="text"
  ...
  className="w-[200px] rounded-[6px] ..."
/>
```

Replace with:
```tsx
<input
  type="text"
  placeholder="Search videos…"
  value={search}
  onChange={e => setSearch(e.target.value)}
  className="w-full rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 sm:w-[200px]"
/>
```

Key change: `w-[200px]` → `w-full sm:w-[200px]`. Remove the `<div className="flex-1" />` spacer — on mobile the input is full-width so no spacer needed; on `sm:` flex-row the spacer pushes the input right.

Full updated filter bar:
```tsx
{/* Filter bar */}
<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
  <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-[3px]">
    {(['all', 'in_progress', 'completed', 'canceled'] as FilterTab[]).map(tab => (
      <button
        key={tab}
        onClick={() => setFilter(tab)}
        className={`rounded-full px-3 py-[3px] text-[12.5px] font-medium transition-all ${
          filter === tab
            ? tab === 'all'
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'bg-orange-500 text-white shadow-sm'
            : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        {tab === 'all'
          ? 'All'
          : tab === 'in_progress'
            ? 'In progress'
            : tab === 'completed'
              ? 'Completed'
              : 'Canceled'}
      </button>
    ))}
  </div>
  <div className="hidden flex-1 sm:block" />
  <input
    type="text"
    placeholder="Search videos…"
    value={search}
    onChange={e => setSearch(e.target.value)}
    className="w-full rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 sm:w-[200px]"
  />
</div>
```

---

## 2. `VideoCard.tsx` — Mobile layout

### 2a. Card inner layout — stack on very small screens

Find the root card div:
```tsx
<div className="group relative flex items-center justify-between rounded-[10px] border border-zinc-200 bg-white px-4 py-[13px] transition-all hover:border-zinc-300 hover:bg-zinc-50/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]">
```

No change to the outer div itself — it already handles the card shape.

### 2b. Right-side div — hide the step progress bar on mobile, keep status badge

Find:
```tsx
<div className="ml-4 flex shrink-0 items-center gap-3">
```

The right div contains: `<StepProgressBar>` and `<StatusBadge>`.

The `StepProgressBar` is a segmented bar that can be narrow. On mobile, hide it to save space:

```tsx
<div className="ml-3 flex shrink-0 items-center gap-2">
  <span className="hidden sm:block">
    <StepProgressBar steps={steps} />
  </span>
  <StatusBadge status={listStatus} />
</div>
```

This keeps the `StatusBadge` always visible (text + dot) but hides the segment bar on mobile.

### 2c. Title + link area — ensure truncation works

Find the `<Link>` with `className="flex min-w-0 flex-1 flex-col gap-1 pl-1"`.

Already has `min-w-0` — truncation on title `<span className="truncate">` will work. No change needed.

---

## 3. `DashboardProjectList.tsx` — Page header

The page header (`h1 "Videos" + count + "New video" button`) is in `src/app/page.tsx`, not in DashboardProjectList. Open `src/app/page.tsx`.

Find:
```tsx
<div className="mb-7 flex items-start justify-between gap-4">
```

No change needed — `justify-between` keeps the button right-aligned on all sizes. The `h1` and `NewVideoModal` button will be side by side at all widths. Fine.

---

## Verification

```bash
bunx tsc --noEmit
```

Visual check at 375px width:
- Filter tabs pill group visible full-width, single row (4 tabs fit: All/In progress/Completed/Canceled)
- Search input below tabs, full width
- VideoCard: title + status badge visible; step progress bar hidden
- No horizontal scroll
