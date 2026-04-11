# 04a — Workflow View: Server Page

## What this builds

The `/projects/[id]` server component. Fetches project + brand from DB, serializes
them, and passes to `WorkflowClient` (the interactive client component).

## Prerequisites

[03a-video-project-model.md](03a-video-project-model.md) — VideoProject model.
[03b-workflow-templates.md](03b-workflow-templates.md) — WORKFLOW_STEPS constant.
[04b-workflow-client.md](04b-workflow-client.md) — WorkflowClient (build this next).

## Files to create

```
src/app/projects/[id]/page.tsx
```

---

## `src/app/projects/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import VideoProject from '@/models/VideoProject'
import BrandProfile from '@/models/BrandProfile'
import { WORKFLOW_STEPS } from '@/lib/workflow-templates'
import { Navbar } from '@/components/Navbar'
import { WorkflowClient } from '@/components/WorkflowClient'

type Props = { params: Promise<{ id: string }> }

export default async function ProjectPage({ params }: Props) {
  await connectDB()
  const { id } = await params

  const project = await VideoProject.findById(id).lean()
  if (!project) notFound()

  const brand = await BrandProfile.findById(project.brandProfileId).lean()
  if (!brand) notFound()

  // Mongoose documents have non-serializable methods.
  // JSON.parse(JSON.stringify()) strips them before passing to Client Components.
  const serializedProject = JSON.parse(JSON.stringify(project))
  const serializedBrand = JSON.parse(JSON.stringify(brand))

  return (
    <>
      <Navbar brandName={brand.name} brandId={String(brand._id)} />
      <WorkflowClient
        project={serializedProject}
        brand={serializedBrand}
        stepDefs={WORKFLOW_STEPS}
      />
    </>
  )
}
```

### Why JSON.parse + JSON.stringify?

Mongoose `.lean()` returns plain objects, but they still contain `ObjectId` instances
(which aren't serializable). The double-JSON converts them to plain strings.
This is a Next.js App Router requirement when passing server data to Client Components.

---

## Verify

After building `WorkflowClient` in the next plan:

```bash
bun dev
```

1. Navigate to `/projects/[id]` → page renders without errors ✓
2. Invalid project ID → 404 page ✓
3. Project and brand data visible in `WorkflowClient` ✓

---

**Output:** Server component that fetches and serializes project data.

**Next step:** [04b-workflow-client.md](04b-workflow-client.md) — WorkflowClient state + auto-start
