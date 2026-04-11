# 02a — Dashboard: Server Page

## What this builds

The `/` dashboard page as a Next.js server component. Fetches brand + projects
server-side (no loading flicker), redirects to `/brand/new` if no brand exists.

## Prerequisites

[01a-brand-model.md](01a-brand-model.md) — BrandProfile model.
[03a-video-project-model.md](03a-video-project-model.md) — VideoProject model (needed
for the project list query). If VideoProject isn't built yet, stub the import — see note below.

## Files to create/modify

```
src/app/page.tsx   ← replace the empty HomePage stub
```

---

## `src/app/page.tsx`

```tsx
import { redirect } from 'next/navigation'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { Navbar } from '@/components/Navbar'
import { NewVideoModal } from '@/components/NewVideoModal'
import { VideoCard } from '@/components/VideoCard'
import { EmptyState } from '@/components/EmptyState'

export default async function DashboardPage() {
  await connectDB()

  const brand = await BrandProfile.findOne().sort({ createdAt: 1 }).lean()
  if (!brand) redirect('/brand/new')

  const projects = await VideoProject.find({ brandProfileId: brand._id })
    .sort({ createdAt: -1 })
    .lean()

  const brandId = String(brand._id)

  return (
    <>
      <Navbar brandName={brand.name} brandId={brandId} />
      <div className="max-w-[780px] mx-auto px-6 py-10 pb-20">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Videos</h1>
            <p className="text-[13px] text-zinc-500 mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
              {projects.length > 0 && (
                <> · last created {formatRelativeDate(projects[0].createdAt)}</>
              )}
            </p>
          </div>
          <NewVideoModal brandProfileId={brandId} />
        </div>

        {/* Project list or empty state */}
        {projects.length === 0 ? (
          <EmptyState brandProfileId={brandId} />
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map(p => (
              <VideoCard key={String(p._id)} project={p} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
```

### Note: building before VideoProject model exists

If you're building M1 before M2, the `VideoProject` import will fail.
Temporary stub until `03a-video-project-model.md` is done:

```ts
// Temporary — replace once VideoProject model is built
const projects: any[] = []
```

Remove the `VideoProject.find(...)` query and use the empty array above.
The empty state will render, and `NewVideoModal` button will show.

---

## Data flow

```
DashboardPage (server)
  ├── connectDB()
  ├── BrandProfile.findOne() → null → redirect('/brand/new')
  ├── VideoProject.find({ brandProfileId }) → projects[]
  └── renders:
      ├── Navbar (brandName, brandId)
      ├── NewVideoModal (client island)
      └── VideoCard[] or EmptyState
```

No client-side fetch. The page renders with data already populated — no flash.

---

## Verify

```bash
bun dev
```

1. No brand in DB → visiting `/` redirects to `/brand/new` ✓
2. Brand exists, no projects → `/` shows empty state with "Create your first video" ✓
3. Brand + projects exist → project list renders ✓

---

**Output:** Working dashboard shell with server-side data fetch and brand redirect guard.

**Next step:** [02b-dashboard-components.md](02b-dashboard-components.md) — VideoCard, StepProgressBar, StatusBadge
