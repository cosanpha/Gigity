# 06d — UI Redesign: Page Layout Wiring

**Milestone:** UI Redesign Pass A  
**Depends on:** `06a` (PageLayout must exist)  
**Scope:** Wire `PageLayout` into the dashboard page; clean up brand pages; document why `projects/[id]` keeps direct Navbar

---

## Context

`PageLayout` (created in `06a`) wraps `<Navbar>` + `<main>` with a unified `max-w-[820px]` centered container. It should replace the manual `<Navbar /> + <main>` pattern on the dashboard page.

Brand pages stay on a narrower `max-w-[640px]` layout and keep their own `<Navbar>` — PageLayout is incompatible there.

The workflow page (`src/app/projects/[id]/page.tsx`) uses a full-bleed two-column layout managed entirely by `WorkflowClient` — it must NOT use PageLayout.

---

## 1. `src/app/page.tsx` — MODIFY

### 1a. Replace imports

Remove:
```tsx
import { Navbar } from '@/components/Navbar'
```

Add:
```tsx
import { PageLayout } from '@/components/PageLayout'
```

Full import block:
```tsx
import { DashboardProjectList } from '@/components/DashboardProjectList'
import { NewVideoModal } from '@/components/NewVideoModal'
import { PageLayout } from '@/components/PageLayout'
import { ACTIVE_BRAND_COOKIE } from '@/lib/active-brand-cookie'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
```

### 1b. Replace JSX wrapper

Find the entire return block and replace with:

```tsx
return (
  <PageLayout
    brandName={activeBrand.name}
    brandId={activeBrandId}
    brandSwitcherBrands={brands.map(b => ({
      id: String(b._id),
      name: b.name,
    }))}
  >
    {/* Page header */}
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-950">
          Videos
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>
      <NewVideoModal brandProfileId={activeBrandId} />
    </div>

    <DashboardProjectList
      projects={projects}
      brandProfileId={activeBrandId}
    />
  </PageLayout>
)
```

---

## 2. `src/app/brand/new/page.tsx` — MODIFY

No PageLayout here (width is 640px, not 820px). Just clean up the `<main>` class.

Find:
```tsx
<main className="mx-auto max-w-[640px] px-6 py-10 pb-20">
```

Leave it exactly as-is — this is already correct. No change needed.

The `<Navbar />` (no props) stays as-is too.

---

## 3. `src/app/brand/[id]/edit/page.tsx` — MODIFY

Same situation — `max-w-[640px]`. Leave `<Navbar>` and `<main>` as-is.

No change needed if the loading state and main state already use:
```tsx
<main className="mx-auto max-w-[640px] px-6 py-10 pb-20">
```

---

## 4. `src/app/projects/[id]/page.tsx` — DO NOT USE PageLayout

This page delegates all layout to `<WorkflowClient>`. WorkflowClient renders:
- Its own title bar (`h-[44px]`)
- `<StepSidebar>` on the left
- A scrollable `<main>` panel on the right
- The outer container is `h-[calc(100vh-52px)]` full-bleed

Using `PageLayout` here would break the full-height layout. Keep:
```tsx
import { Navbar } from '@/components/Navbar'
```

And keep the page structure exactly as-is.

---

## Verification

```bash
bunx tsc --noEmit
```

Expected: zero errors (or only framer-motion error if `06e` not done yet).

Visual check:
- Dashboard page renders with `PageLayout` (Navbar + centered 820px max-width main)
- Brand pages render with their own Navbar + 640px main
- Workflow page is unaffected
