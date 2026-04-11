# 04b — Workflow View: WorkflowClient

## What this builds

The main client component for the workflow view. Holds all interactive state,
implements `generate()` and `approve()` with optimistic updates, and auto-starts
step 1 on page load.

## Prerequisites

[04a-workflow-page.md](04a-workflow-page.md) — page passes data to this component.
[03f-api-generate.md](03f-api-generate.md) + [03g-api-approve.md](03g-api-approve.md) — API routes.

## Files to create

```
src/components/WorkflowClient.tsx
```

---

## State shape

```ts
type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}
```

One `StepState` per step. Initialized from server-fetched project data.

---

## `src/components/WorkflowClient.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { StepDefinition } from '@/lib/workflow-templates'
import { StepSidebar } from './StepSidebar'
import { LLMStepPanel } from './LLMStepPanel'
import { ExternalStepPanel } from './ExternalStepPanel'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

interface WorkflowClientProps {
  project: { _id: string; steps: any[] }
  brand: { name: string }
  stepDefs: StepDefinition[]
}

export function WorkflowClient({ project, stepDefs }: WorkflowClientProps) {
  const [activeStep, setActiveStep] = useState(1)
  const [steps, setSteps] = useState<StepState[]>(
    project.steps.map((s: any) => ({
      status: s.status,
      llmResponse: s.llmResponse ?? null,
      outputAssetUrl: s.outputAssetUrl ?? null,
      conversation: s.conversation ?? [],
      error: null,
    }))
  )
  const [followUp, setFollowUp] = useState('')
  const [assetUrl, setAssetUrl] = useState('')

  // Auto-start step 1 when landing on a brand-new project
  useEffect(() => {
    const step1 = steps[0]
    if (step1.status === 'pending' && !step1.llmResponse) {
      generate(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generate(
    n: number,
    opts: { retry?: boolean; followUpMessage?: string } = {}
  ) {
    setSteps(prev => patch(prev, n, { status: 'generating', error: null }))

    const res = await fetch(
      `/api/v1/projects/${project._id}/steps/${n}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    )

    if (res.ok) {
      const data = await res.json()
      setSteps(prev => {
        const current = prev[n - 1]
        const newConversation = opts.retry
          ? [{ role: 'assistant', content: data.llmResponse }]
          : opts.followUpMessage
          ? [
              ...current.conversation,
              { role: 'user', content: opts.followUpMessage },
              { role: 'assistant', content: data.llmResponse },
            ]
          : [{ role: 'assistant', content: data.llmResponse }]

        return patch(prev, n, {
          status: 'pending',
          llmResponse: data.llmResponse,
          conversation: newConversation,
          error: null,
        })
      })
      if (opts.followUpMessage) setFollowUp('')
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setSteps(prev => patch(prev, n, { status: 'pending', error: err.error }))
    }
  }

  async function approve(n: number, opts: { outputAssetUrl?: string } = {}) {
    const res = await fetch(
      `/api/v1/projects/${project._id}/steps/${n}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    )

    if (res.ok) {
      setSteps(prev => patch(prev, n, { status: 'done' }))
      setAssetUrl('')
      if (n < 11) setActiveStep(n + 1)  // advance to next step
    }
  }

  function patch(prev: StepState[], n: number, updates: Partial<StepState>): StepState[] {
    return prev.map((s, i) => (i === n - 1 ? { ...s, ...updates } : s))
  }

  const currentStepState = steps[activeStep - 1]
  const currentStepDef = stepDefs.find(d => d.stepNumber === activeStep)!

  // Get the prior step's output for ExternalStepPanel context card
  function getPriorOutput(): string | null {
    if (activeStep <= 1) return null
    const prior = steps[activeStep - 2]
    return prior?.llmResponse ?? prior?.outputAssetUrl ?? null
  }

  return (
    <div className="flex h-[calc(100vh-52px)]">  {/* 52px = nav height */}
      <StepSidebar
        steps={steps}
        stepDefs={stepDefs}
        activeStep={activeStep}
        onSelect={setActiveStep}
      />
      <main className="flex-1 overflow-y-auto">
        {currentStepDef.type === 'llm' ? (
          <LLMStepPanel
            stepDef={currentStepDef}
            state={currentStepState}
            followUp={followUp}
            onFollowUpChange={setFollowUp}
            onGenerate={() => generate(activeStep)}
            onRetry={() => generate(activeStep, { retry: true })}
            onSendFollowUp={() =>
              generate(activeStep, { followUpMessage: followUp })
            }
            onApprove={() => approve(activeStep)}
          />
        ) : (
          <ExternalStepPanel
            stepNumber={activeStep}
            stepDef={currentStepDef}
            state={currentStepState}
            priorStepOutput={getPriorOutput()}
            assetUrl={assetUrl}
            onAssetUrlChange={setAssetUrl}
            onApprove={() => approve(activeStep, { outputAssetUrl: assetUrl })}
          />
        )}
      </main>
    </div>
  )
}
```

---

## Key behaviors

- **Auto-start:** `useEffect` fires on mount. If step 1 is `pending` with no
  `llmResponse` (brand-new project), calls `generate(1)` immediately.
  If step 1 is already done (returning to an existing project), skips.
- **Optimistic generate:** Sets `status: 'generating'` immediately before the
  API call — UI shows spinner instantly.
- **After approve:** Advances `activeStep` to N+1 automatically.
- **Retry:** Clears conversation client-side and server-side (via `retry: true` in body).

---

**Output:** WorkflowClient with full state management, generate/approve functions, auto-start.

**Next step:** [04c-step-sidebar.md](04c-step-sidebar.md) — StepSidebar component
