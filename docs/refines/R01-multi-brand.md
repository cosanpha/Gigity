# R01 — Multi-brand Support

## What this builds

Allow the user to create and manage multiple brand profiles. The dashboard shows a
brand list. Each brand has its own set of video projects. The active brand is selected
from the nav.

## Why

Currently the app redirects to `/brand/new` if no brand exists, and always uses the
first brand found. Multi-brand means: Deewas + a second client brand can coexist.

## Files to change

```
src/app/page.tsx                       ← brand list + brand selector
src/app/api/v1/brand/route.ts          ← GET returns ALL brands (not first)
src/app/api/v1/projects/route.ts       ← POST also returns list for dashboard refresh
src/components/Navbar.tsx              ← brand selector dropdown
src/app/brand/new/page.tsx             ← back button → / instead of stuck page
```

## Files to create

```
src/app/brand/page.tsx                 ← /brand — brand list page (select or create)
```

---

## Step 1 — Update GET /api/v1/brand to return all brands

```ts
// src/app/api/v1/brand/route.ts — replace GET
export async function GET() {
  await connectDB()
  const profiles = await BrandProfile.find().sort({ createdAt: 1 }).lean()
  return NextResponse.json(profiles)
}
```

Note: The `/brand/[id]/edit` page still uses `GET /api/v1/brand/:id` (single brand),
which is unchanged.

---

## Step 2 — Dashboard: brand list + per-brand projects

The dashboard currently shows all projects for the single brand. With multi-brand:

- If 0 brands → redirect to `/brand/new`
- If 1+ brands → show brand tabs/list at top, projects below for selected brand

```tsx
// src/app/page.tsx (server component)
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { VideoCard } from '@/components/VideoCard'
import { EmptyState } from '@/components/EmptyState'
import { NewVideoModal } from '@/components/NewVideoModal'

type Props = { searchParams: Promise<{ brand?: string }> }

export default async function DashboardPage({ searchParams }: Props) {
  await connectDB()

  const brands = await BrandProfile.find().sort({ createdAt: 1 }).lean()
  if (brands.length === 0) redirect('/brand/new')

  const { brand: brandId } = await searchParams
  // Use first brand if no query param
  const activeBrand = brands.find(b => String(b._id) === brandId) ?? brands[0]
  const activeBrandId = String(activeBrand._id)

  const projects = await VideoProject.find({ brandProfileId: activeBrand._id })
    .sort({ createdAt: -1 })
    .lean()

  return (
    <>
      <Navbar
        brandName={activeBrand.name}
        brandId={activeBrandId}
      />
      <div className="mx-auto max-w-[780px] px-6 py-10 pb-20">
        {/* Brand tabs (shown when multiple brands exist) */}
        {brands.length > 1 && (
          <div className="mb-8 flex items-center gap-2 overflow-x-auto">
            {brands.map(b => {
              const id = String(b._id)
              const isActive = id === activeBrandId
              return (
                <a
                  key={id}
                  href={`/?brand=${id}`}
                  className={`rounded-full border px-4 py-1.5 text-[13px] whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  {b.name}
                </a>
              )
            })}
            <a
              href="/brand/new"
              className="rounded-full border border-dashed border-zinc-300 px-4 py-1.5 text-[13px] whitespace-nowrap text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
            >
              + New brand
            </a>
          </div>
        )}

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Videos</h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <NewVideoModal brandProfileId={activeBrandId} />
        </div>

        {projects.length === 0 ? (
          <EmptyState brandProfileId={activeBrandId} />
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map(p => (
              <VideoCard
                key={String(p._id)}
                project={p}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

Note: `searchParams` is a Promise in Next.js 16 — must be awaited.

---

## Step 3 — Navbar: link brand name to edit, add "+ New brand" link

```tsx
// src/components/Navbar.tsx
interface NavbarProps {
  brandName?: string
  brandId?: string
}

export function Navbar({ brandName, brandId }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-indigo-500 text-[13px] font-bold text-white">
            G
          </div>
          Gigity
        </Link>
        {brandName && (
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[13px] text-zinc-500">
            {brandName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {brandId && (
          <Link
            href={`/brand/${brandId}/edit`}
            className="rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950"
          >
            Edit brand
          </Link>
        )}
        <Link
          href="/brand/new"
          className="rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950"
        >
          + New brand
        </Link>
      </div>
    </nav>
  )
}
```

---

## Step 4 — Brand new page: add back link

```tsx
// src/app/brand/new/page.tsx — add back link in header
<div className="mb-6 flex items-center gap-3">
  <Link href="/" className="text-[13px] text-zinc-400 hover:text-zinc-600">← Back</Link>
</div>
<h1 className="text-xl font-semibold tracking-tight mb-1">Set up your brand</h1>
```

---

## Verify

1. Create a second brand — it appears as a tab on the dashboard
2. Click a brand tab — projects below update to that brand's projects
3. "+ New brand" in nav → goes to brand setup
4. Creating a project still uses the active brand's ID

---

**Output:** Dashboard shows brand tabs. Each brand has its own project list. User can create unlimited brands.

**Next step:** [R02-project-management.md](R02-project-management.md) — delete and edit projects

