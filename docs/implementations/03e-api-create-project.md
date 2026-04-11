# 03e — Workflow Engine: POST /api/v1/projects

## What this builds

One API route: `POST /api/v1/projects`. Creates a `VideoProject` with 11 pre-initialized
`WorkflowStep` entries (all `status: 'pending'`). Returns the new project including
its `_id`, which the UI uses to redirect to `/projects/[id]`.

## Prerequisites

[03a-video-project-model.md](03a-video-project-model.md) — VideoProject model.
[01a-brand-model.md](01a-brand-model.md) — BrandProfile model (validated on create).

## Files to create

```
src/app/api/v1/projects/route.ts
```

---

## `src/app/api/v1/projects/route.ts`

```ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import VideoProject from '@/models/VideoProject'
import BrandProfile from '@/models/BrandProfile'

export async function POST(req: Request) {
  await connectDB()

  const body = await req.json()
  const { brandProfileId, title } = body

  if (!brandProfileId) {
    return NextResponse.json({ error: 'brandProfileId is required' }, { status: 400 })
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  // Validate the brand profile exists
  const brand = await BrandProfile.findById(brandProfileId)
  if (!brand) {
    return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 })
  }

  // Initialize all 11 steps as pending
  const steps = Array.from({ length: 11 }, (_, i) => ({
    stepNumber: i + 1,
    conversation: [],
    llmResponse: null,
    outputAssetUrl: null,
    status: 'pending',
    completedAt: null,
  }))

  const project = await VideoProject.create({
    brandProfileId,
    title: title.trim(),
    steps,
  })

  return NextResponse.json(project, { status: 201 })
}
```

---

## Smoke test

```bash
# First get the brand _id
BRAND_ID=$(curl -s http://localhost:3000/api/v1/brand | bun -e "const d=await Bun.stdin.json(); console.log(d._id)")

# Create a project
curl -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d "{\"brandProfileId\":\"$BRAND_ID\",\"title\":\"Deewas — April campaign\"}"
```

Expected response: project object with `_id`, `status: "in_progress"`, `steps` array
of 11 objects each with `status: "pending"`.

---

## What happens next in the UI flow

1. `NewVideoModal` calls `POST /api/v1/projects` with `brandProfileId` + `title`
2. Gets back `project._id`
3. `router.push(/projects/${project._id})`
4. The workflow page loads and auto-triggers step 1 generate

The chain from "Create & start →" to seeing the first AI response takes about 3-5 seconds.

---

**Output:** Working `POST /api/v1/projects` that initializes a project with 11 pending steps.

**Next step:** [03f-api-generate.md](03f-api-generate.md) — POST .../steps/[n]/generate
