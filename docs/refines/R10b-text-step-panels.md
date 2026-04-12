# R10b — Collapse 3 Identical Text Step Panels

**Prerequisite:** Run R10a first (depends on `StepState` exported from workflow-templates).

**Constraint:** Zero UI or behavior change. Steps 1, 2, and 3 in the workflow view must
look and behave exactly as before.

---

## The problem

`CampaignBriefStepPanel.tsx` (209 lines), `StoryStepPanel.tsx` (207 lines), and
`SongLyricsStepPanel.tsx` (208 lines) are copy-paste identical except for:

| Difference | Campaign Brief | Story Script | Song Lyrics |
|------------|---------------|--------------|-------------|
| Step number shown | `Step 1 of N` | `Step 2 of N` | `Step 3 of N` |
| Tool shown | `Gigity` | `Gigity` | `SunoAI` |
| `<h2>` title | `Campaign Brief` | `Story Script` | `Song Lyrics` |
| `rows` on main textarea | `18` | `24` | `24` |
| "Ready to generate…" label | "campaign brief" | "story script" | "song lyrics" |
| "Generating X…" label | "campaign brief…" | "story script…" | "song lyrics…" |
| "Approved" sub-message | "edit the brief" | "edit the script" | "edit the lyrics" |
| Follow-up placeholder | "brief" context | "script" context | "lyrics" context |

**~615 lines → ~120 lines** after collapsing into one component.

---

## Step 1 — Create `src/components/EditableTextStepPanel.tsx`

```tsx
'use client'

import { GenerateSpinner } from './ui/GenerateSpinner'
import { WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import type { StepState } from '@/lib/workflow-templates'
import { startTransition, useEffect, useRef, useState } from 'react'

interface EditableTextStepPanelProps {
  stepNumber: number
  title: string
  tool: string
  textareaRows?: number
  generateLabel?: string    // e.g. "campaign brief" — used in "Ready to generate your X."
  generatingLabel?: string  // e.g. "campaign brief…" — used in "Generating X…"
  approvedLabel?: string    // e.g. "brief" — used in "Re-open to edit the X."
  followUpPlaceholder?: string
  state: StepState
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: () => void
  onReopen: () => void
  onContentChange: (content: string) => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="shrink-0 rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

export function EditableTextStepPanel({
  stepNumber,
  title,
  tool,
  textareaRows = 20,
  generateLabel,
  generatingLabel,
  approvedLabel,
  followUpPlaceholder = 'Refine…',
  state,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
}: EditableTextStepPanelProps) {
  const [editedContent, setEditedContent] = useState(state.llmResponse ?? '')
  const prevStatusRef = useRef(state.status)

  useEffect(() => {
    if (prevStatusRef.current === 'generating' && state.status === 'pending') {
      startTransition(() => setEditedContent(state.llmResponse ?? ''))
    }
    prevStatusRef.current = state.status
  }, [state.status, state.llmResponse])

  const label = generateLabel ?? title.toLowerCase()
  const gLabel = generatingLabel ?? `${label}…`
  const aLabel = approvedLabel ?? label

  const isEmptyStart = state.status === 'pending' && !state.llmResponse && !state.error
  const isGenerating = state.status === 'generating'
  const isLocked = state.status === 'done'
  const showWorkspace =
    !isEmptyStart && !isGenerating && (Boolean(state.llmResponse) || Boolean(state.error) || isLocked)

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step {stepNumber} of {WORKFLOW_TOTAL_STEPS}</span>
          <span>·</span>
          <span>{tool}</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">{title}</h2>
      </div>

      {isEmptyStart && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[13px] text-zinc-500">Ready to generate your {label}.</p>
          <button
            onClick={onGenerate}
            className="rounded-[6px] bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Generate
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <GenerateSpinner />
          <p className="text-[13px] text-zinc-500">Generating {gLabel}</p>
        </div>
      )}

      {showWorkspace && (
        <div className="flex flex-col gap-5">
          {isLocked && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-green-600">
                Approved - Re-open to edit the {aLabel}.
              </p>
              {state.llmResponse ? <CopyButton text={state.llmResponse} /> : null}
            </div>
          )}

          {state.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          {state.llmResponse && (
            <textarea
              value={isLocked ? (state.llmResponse ?? '') : editedContent}
              onChange={e => {
                setEditedContent(e.target.value)
                onContentChange(e.target.value)
              }}
              readOnly={isLocked}
              rows={textareaRows}
              spellCheck={false}
              className="w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 read-only:bg-zinc-50 read-only:text-zinc-700 focus:border-orange-400"
            />
          )}

          <div className="flex gap-2">
            <textarea
              value={followUp}
              onChange={e => onFollowUpChange(e.target.value)}
              placeholder={followUpPlaceholder}
              rows={2}
              className="flex-1 resize-none rounded-[6px] border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none"
            />
            <button
              onClick={onSendFollowUp}
              disabled={!followUp.trim()}
              className="self-end rounded-[6px] border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Re-generate
            </button>
            {isLocked ? (
              <button
                onClick={onReopen}
                className="rounded-[6px] border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Re-open
              </button>
            ) : (
              <button
                onClick={onApprove}
                className="rounded-[6px] bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
              >
                ✓ Approve
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Step 2 — Update `WorkflowClient.tsx` to use `EditableTextStepPanel`

Open `src/components/WorkflowClient.tsx`. Find the section that renders different step panels
based on `activeStep` (there is a large if/else or switch block in the JSX return).

**Remove these 3 imports:**
```ts
import { CampaignBriefStepPanel } from './CampaignBriefStepPanel'
import { StoryStepPanel } from './StoryStepPanel'
import { SongLyricsStepPanel } from './SongLyricsStepPanel'
```

**Add this import:**
```ts
import { EditableTextStepPanel } from './EditableTextStepPanel'
```

Find the render blocks for steps 1, 2, and 3. They look like:

```tsx
{activeStep === 1 && (
  <CampaignBriefStepPanel
    state={...}
    followUp={followUp}
    onFollowUpChange={setFollowUp}
    onGenerate={() => generate(1)}
    onRetry={() => generate(1, { retry: true })}
    onSendFollowUp={() => generate(1, { followUpMessage: followUp })}
    onApprove={() => approve(1)}
    onReopen={() => reopen(1)}
    onContentChange={content => updateStepContent(1, content)}
  />
)}
```

Replace all three with `EditableTextStepPanel` calls using the exact same props,
plus step-specific config:

**Step 1 — Campaign Brief:**
```tsx
{activeStep === 1 && (
  <EditableTextStepPanel
    stepNumber={1}
    title="Campaign Brief"
    tool="Gigity"
    textareaRows={18}
    generateLabel="campaign brief"
    generatingLabel="campaign brief…"
    approvedLabel="brief"
    followUpPlaceholder="Refine the brief… e.g. stronger hook, clearer CTA, different tone"
    state={steps[0]}
    followUp={followUp}
    onFollowUpChange={setFollowUp}
    onGenerate={() => generate(1)}
    onRetry={() => generate(1, { retry: true })}
    onSendFollowUp={() => generate(1, { followUpMessage: followUp })}
    onApprove={() => approve(1)}
    onReopen={() => reopen(1)}
    onContentChange={content => updateStepContent(1, content)}
  />
)}
```

**Step 2 — Story Script:**
```tsx
{activeStep === 2 && (
  <EditableTextStepPanel
    stepNumber={2}
    title="Story Script"
    tool="Gigity"
    textareaRows={24}
    generateLabel="story script"
    generatingLabel="story script…"
    approvedLabel="script"
    followUpPlaceholder="Refine the script… e.g. make it more emotional, shorter, change the ending"
    state={steps[1]}
    followUp={followUp}
    onFollowUpChange={setFollowUp}
    onGenerate={() => generate(2)}
    onRetry={() => generate(2, { retry: true })}
    onSendFollowUp={() => generate(2, { followUpMessage: followUp })}
    onApprove={() => approve(2)}
    onReopen={() => reopen(2)}
    onContentChange={content => updateStepContent(2, content)}
  />
)}
```

**Step 3 — Song Lyrics:**
```tsx
{activeStep === 3 && (
  <EditableTextStepPanel
    stepNumber={3}
    title="Song Lyrics"
    tool="SunoAI"
    textareaRows={24}
    generateLabel="song lyrics"
    generatingLabel="song lyrics…"
    approvedLabel="lyrics"
    followUpPlaceholder="Refine the lyrics… e.g. shorter chorus, different rhyme, clearer hook"
    state={steps[2]}
    followUp={followUp}
    onFollowUpChange={setFollowUp}
    onGenerate={() => generate(3)}
    onRetry={() => generate(3, { retry: true })}
    onSendFollowUp={() => generate(3, { followUpMessage: followUp })}
    onApprove={() => approve(3)}
    onReopen={() => reopen(3)}
    onContentChange={content => updateStepContent(3, content)}
  />
)}
```

**Note on `approve` function:** The original panels call `onApprove()` with no arguments.
Check the `approve` function in `WorkflowClient` — it may be named differently (e.g. just
part of the inline `onApprove` handler). Match whatever the existing wiring is exactly.

---

## Step 3 — Delete the 3 old files

After confirming the app compiles and all three steps render correctly:

```bash
rm src/components/CampaignBriefStepPanel.tsx
rm src/components/StoryStepPanel.tsx
rm src/components/SongLyricsStepPanel.tsx
```

---

## Verification

```bash
npx tsc --noEmit
```

Then manually test in the browser:
1. Open a project at step 1 → Campaign Brief loads, "Generate" works, text appears, "✓ Approve" works
2. Navigate to step 2 → Story Script loads, same flow works
3. Navigate to step 3 → Song Lyrics loads with SunoAI label, same flow works
4. Check that re-open works on an approved step

If any step shows blank or wrong content, check that the `state` prop is wired to
`steps[stepNumber - 1]` (0-indexed) in WorkflowClient.
