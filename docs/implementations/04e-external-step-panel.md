# 04e — Workflow View: ExternalStepPanel

## What this builds

The main panel for external steps (6, 9, 10, 11). Shows instructions, a link to the
external tool, a collapsible context card with the prior step's output, optional URL
input (steps 6, 9 only), and the Approve button.

## Prerequisites

[04b-workflow-client.md](04b-workflow-client.md) — WorkflowClient passes handlers here.

## Files to create

```
src/components/ExternalStepPanel.tsx
```

Reference design: `docs/designs/workflow-view.html` (external step state)

---

## `src/components/ExternalStepPanel.tsx`

```tsx
'use client'

import { useState } from 'react'
import { StepDefinition } from '@/lib/workflow-templates'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  outputAssetUrl: string | null
}

interface ExternalStepPanelProps {
  stepNumber: number
  stepDef: StepDefinition
  state: StepState
  priorStepOutput: string | null   // shown in collapsible context card
  assetUrl: string
  onAssetUrlChange: (v: string) => void
  onApprove: () => void
}

// Steps 6 and 9 require a URL. Steps 10 and 11 just need Approve.
const STEPS_REQUIRING_URL = [6, 9]

export function ExternalStepPanel({
  stepNumber, stepDef, state, priorStepOutput,
  assetUrl, onAssetUrlChange, onApprove,
}: ExternalStepPanelProps) {
  const [contextOpen, setContextOpen] = useState(true)
  const needsUrl = STEPS_REQUIRING_URL.includes(stepNumber)

  return (
    <div className="max-w-[720px] mx-auto px-8 py-8">

      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-1">
          <span>Step {stepNumber} of 11</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="text-[11px] border border-zinc-300 rounded px-1.5 py-0.5">↗</span>
            {stepDef.tool}
          </span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {stepDef.title}
        </h2>
      </div>

      {/* Approved state */}
      {state.status === 'done' && (
        <div>
          <div className="flex items-center gap-2 mb-4 text-[13px] text-green-600 font-medium">
            <span className="w-[18px] h-[18px] rounded-full bg-green-500 flex items-center
                             justify-center text-white text-[11px]">✓</span>
            Completed
          </div>
          {state.outputAssetUrl && (
            <div className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-[6px]">
              <p className="text-[12px] text-zinc-400 mb-1 uppercase tracking-wide">Asset URL</p>
              <a
                href={state.outputAssetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline break-all"
              >
                {state.outputAssetUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Active state */}
      {state.status !== 'done' && (
        <div className="flex flex-col gap-5">

          {/* Collapsible context card — prior step output */}
          {priorStepOutput && (
            <div className="border border-zinc-200 rounded-[6px] overflow-hidden">
              <button
                onClick={() => setContextOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50
                           text-[13px] text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <span>Context from previous step</span>
                <span className="text-zinc-400 text-[11px]">{contextOpen ? '▼' : '▶'}</span>
              </button>
              {contextOpen && (
                <div className="px-4 py-3 border-t border-zinc-200">
                  <pre className="text-[13px] text-zinc-700 whitespace-pre-wrap leading-relaxed
                                  font-sans max-h-48 overflow-y-auto">
                    {priorStepOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Instruction card */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-[6px] px-5 py-4">
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
              {stepDef.instruction}
            </p>
            {stepDef.externalLink && (
              <a
                href={stepDef.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-white
                           border border-zinc-200 rounded-[6px] text-[13px] text-zinc-700
                           hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
              >
                Open {stepDef.tool}
                <span className="text-zinc-400">↗</span>
              </a>
            )}
          </div>

          {/* Expiry warning */}
          {stepDef.expiryWarning && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200
                            rounded-[6px] text-[13px] text-amber-700">
              <span className="shrink-0">⚠</span>
              <span>{stepDef.expiryWarning}</span>
            </div>
          )}

          {/* URL input (steps 6 and 9 only) */}
          {needsUrl && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-zinc-700">
                {stepNumber === 6 ? 'Character image URLs (one per line)' : 'Asset URL'}
              </label>
              <textarea
                value={assetUrl}
                onChange={e => onAssetUrlChange(e.target.value)}
                placeholder="https://..."
                rows={3}
                className="px-3 py-2 border border-zinc-200 rounded-[6px] text-sm
                           placeholder:text-zinc-400 resize-none focus:outline-none
                           focus:border-indigo-500"
              />
            </div>
          )}

          {/* Approve button */}
          <button
            onClick={onApprove}
            disabled={needsUrl && !assetUrl.trim()}
            className="self-start px-5 py-2 bg-indigo-500 text-white text-sm font-medium
                       rounded-[6px] hover:bg-indigo-600 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
          >
            {stepNumber === 11 ? 'Mark as published ✓' : 'Mark as done ✓'}
          </button>

        </div>
      )}
    </div>
  )
}
```

---

## The context card matters

Steps 6 and 9 are the "hand-off" steps where the user takes AI-generated prompts to
an external tool. Without the context card showing the prior step's output, the user
has to navigate back to step 5 (or step 8) to find the prompts. The collapsible card
keeps the prompts visible right where they need them.

---

## Verify (full workflow end-to-end)

After all 04* plans are implemented:

```bash
bun dev
```

1. Create a new video project → auto-redirects to workflow view
2. Step 1 starts generating automatically ✓
3. After step 1 generates: response appears, Approve button active ✓
4. Approve step 1 → step 2 unlocks, active step advances ✓
5. Navigate to step 6 → see context card with step 5's prompts ✓
6. Paste URLs, click "Mark as done" ✓
7. Complete step 11 → project shows "Completed" badge on dashboard ✓

---

**Output:** ExternalStepPanel with instructions, context card, URL input, approve button.

**Next step:** [05-prompt-validation.md](05-prompt-validation.md) — validate the 7 LLM prompts
