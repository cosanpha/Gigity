# 03g — Workflow Engine: POST .../steps/[n]/approve

## What this builds

The approve route: `POST /api/v1/projects/[id]/steps/[n]/approve`.
Marks a step as `done`. Handles LLM steps, external steps (with URL), and
the two no-URL steps (10, 11). Marks the project `completed` when step 11 is approved.

## Prerequisites

[03f-api-generate.md](03f-api-generate.md) — generate must be built first; approve is called after.

## Files to create

```
src/app/api/v1/projects/[id]/steps/[n]/approve/route.ts
```

---

## Request body

```ts
{
  outputAssetUrl?: string   // required for steps 6, 9 (external steps with a URL)
                            // optional/ignored for steps 10, 11
                            // ignored for LLM steps
}
```

---

## Route

```ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import VideoProject from '@/models/VideoProject'
import { getStepDefinition } from '@/lib/workflow-templates'

type Ctx = { params: Promise<{ id: string; n: string }> }

// Steps that require a URL when approved
const STEPS_REQUIRING_URL = [6, 9]

export async function POST(req: Request, { params }: Ctx) {
  await connectDB()

  const { id, n } = await params
  const stepNumber = parseInt(n, 10)

  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 11) {
    return NextResponse.json({ error: 'Invalid step number' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { outputAssetUrl } = body as { outputAssetUrl?: string }

  const project = await VideoProject.findById(id)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const stepDef = getStepDefinition(stepNumber)
  const step = project.steps[stepNumber - 1]

  // Idempotent — approving an already-done step is a no-op
  if (step.status === 'done') {
    return NextResponse.json({ ok: true })
  }

  // Enforce ordering: step N-1 must be done before N can be approved
  if (stepNumber > 1 && project.steps[stepNumber - 2].status !== 'done') {
    return NextResponse.json(
      { error: `Complete step ${stepNumber - 1} first` },
      { status: 400 }
    )
  }

  // LLM step: must have a response to approve
  if (stepDef?.type === 'llm' && !step.llmResponse) {
    return NextResponse.json(
      { error: 'Generate output before approving' },
      { status: 400 }
    )
  }

  // External steps with URL: steps 6 and 9 require outputAssetUrl
  if (STEPS_REQUIRING_URL.includes(stepNumber)) {
    const url = outputAssetUrl?.trim()
    if (!url) {
      return NextResponse.json(
        { error: 'outputAssetUrl is required for this step' },
        { status: 400 }
      )
    }
    step.outputAssetUrl = url
  }

  // Mark done
  step.status = 'done'
  step.completedAt = new Date()

  // Completing step 11 finishes the whole project
  if (stepNumber === 11) {
    project.status = 'completed'
  }

  await project.save()
  return NextResponse.json({ ok: true })
}
```

---

## Behavior by step type

| Step(s) | Type | URL required? | What approve does |
|---------|------|---------------|-------------------|
| 1–5, 7–8 | `llm` | No | Sets `status: done`, `completedAt` |
| 6, 9 | `external_instruction` | **Yes** — saves to `outputAssetUrl` | Sets `status: done`, saves URL |
| 10, 11 | `external_instruction` | No | Sets `status: done` |
| 11 only | | | Also sets project `status: completed` |

---

## Smoke test

```bash
# Approve a done LLM step (after generate)
curl -X POST http://localhost:3000/api/v1/projects/PROJECT_ID/steps/1/approve \
  -H 'Content-Type: application/json' \
  -d '{}'

# Approve step 6 (requires URL)
curl -X POST http://localhost:3000/api/v1/projects/PROJECT_ID/steps/6/approve \
  -H 'Content-Type: application/json' \
  -d '{"outputAssetUrl":"https://cdn.example.com/character1.png"}'

# Approve step 6 without URL → 400
curl -X POST http://localhost:3000/api/v1/projects/PROJECT_ID/steps/6/approve \
  -H 'Content-Type: application/json' \
  -d '{}'
# → {"error":"outputAssetUrl is required for this step"}
```

---

**Output:** Working approve route. Steps advance in order. Step 11 closes the project.

**Next step:** [04a-workflow-page.md](04a-workflow-page.md) — /projects/[id] server page
