# R10a — Shared Primitives: StepState type + CopyButton + GenerateSpinner

**Constraint:** No UI changes. No behavior changes. Pure structural cleanup.

**Run this chunk first.** R10b depends on the shared type exported here.

---

## Step 1 — Export canonical `StepState` from `workflow-templates.ts`

`StepState` is locally redefined in **10 files** with slightly different shapes.
The canonical full shape (from `WorkflowClient.tsx`) is:

```ts
type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
  sunoApiKeyOverride: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}
```

Components that only use a subset (e.g., `StepSidebar` only needs `status`) use
local narrower types, which is fine. The goal is to stop re-defining the **full** type.

**Edit `src/lib/workflow-templates.ts`** — add this export near the top (after existing type exports):

```ts
// Canonical step runtime state — used by WorkflowClient and all step panels
export type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
  sunoApiKeyOverride: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

// Narrow read-only view for components that only need status
export type StepStatusState = Pick<StepState, 'status'>
```

**Update these files** to import `StepState` from `@/lib/workflow-templates` and delete
their local `type StepState = { ... }` block:

- `src/components/WorkflowClient.tsx` — has the full type; delete local, add import
- `src/components/LLMStepPanel.tsx` — delete local `type StepState`; add import
- `src/components/KlingStepPanel.tsx` — delete local `type StepState`; add import
- `src/components/MusicPromptStepPanel.tsx` — delete local `type StepState`; add import
- `src/components/ExternalStepPanel.tsx` — delete local `type StepState`; add import
- `src/components/SceneStepPanel.tsx` — rename local to `StepState`; use import instead
- `src/components/CampaignBriefStepPanel.tsx` — delete local; add import (R10b will delete this file, but fix now)
- `src/components/StoryStepPanel.tsx` — delete local; add import (same)
- `src/components/SongLyricsStepPanel.tsx` — delete local; add import (same)

**Do NOT change `StepSidebar.tsx`** — it uses a 1-field local type (`{ status: ... }`)
which is intentionally narrow. Leave it.

**Do NOT change `CharacterStepPanel.tsx`** — it uses `CharacterStepState` (a different name
with extra field `outputAssetUrl`). After adding the export, update it to import
`StepState` from workflow-templates and use that instead of `CharacterStepState`
(the shapes match, `StepState` has `outputAssetUrl`). Then delete its local type.

---

## Step 2 — Centralize `CopyButton` in `src/components/ui/CopyButton.tsx`

**Current situation:**
- `LLMStepPanel.tsx` — exported as `export function CopyButton`
- `KlingStepPanel.tsx` — local `function CopyButton` (duplicate, not exported)
- `CampaignBriefStepPanel.tsx` — local `function CopyButton` (duplicate)
- `StoryStepPanel.tsx` — local `function CopyButton` (duplicate)
- `SongLyricsStepPanel.tsx` — local `function CopyButton` (duplicate)

`CharacterStepPanel.tsx` already imports from `LLMStepPanel` — this is the pattern to
follow, but the source should move out of `LLMStepPanel`.

**Create `src/components/ui/CopyButton.tsx`:**

```tsx
'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-[12px] text-zinc-400 transition-colors hover:text-zinc-700"
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}
```

**IMPORTANT:** `LLMStepPanel.tsx` has TWO versions of CopyButton with different styling:
- The exported one: `text-[12px] text-zinc-400` (used in block headers)
- The local version in CampaignBrief/Story/SongLyrics panels: `rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600` (a button-style variant)

These are genuinely different. Centralize the `text-[12px] text-zinc-400` version
(the one `LLMStepPanel` already exports). The button-style variant in the text panels
is only used there and R10b will replace those panels anyway.

**Edit `src/components/LLMStepPanel.tsx`:**
- Add import: `import { CopyButton } from './ui/CopyButton'`
- Delete the local `export function CopyButton` definition (it moves to ui/)
- Keep the named re-export if needed: `export { CopyButton } from './ui/CopyButton'`
  (this preserves backward compat with `CharacterStepPanel` which imports from `LLMStepPanel`)

**Edit `src/components/KlingStepPanel.tsx`:**
- Delete local `function CopyButton`
- Add import: `import { CopyButton } from './ui/CopyButton'`

**After R10b runs:** `CampaignBriefStepPanel`, `StoryStepPanel`, `SongLyricsStepPanel`
will be deleted, so their local copies go away automatically.

---

## Step 3 — Centralize `GenerateSpinner` in `src/components/ui/GenerateSpinner.tsx`

The large orange SVG spinner appears in at least 5 panel files:

```tsx
<svg className="h-6 w-6 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
</svg>
```

**Create `src/components/ui/GenerateSpinner.tsx`:**

```tsx
export function GenerateSpinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-orange-500"
      style={{ width: size, height: size }}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
      />
    </svg>
  )
}
```

**Edit these files** to replace the inline SVG with `<GenerateSpinner />`:

- `src/components/LLMStepPanel.tsx` — 1 instance in "generating" state
- `src/components/MusicPromptStepPanel.tsx` — 1 instance
- `src/components/KlingStepPanel.tsx` — 1 instance
- `src/components/CharacterStepPanel.tsx` — 1 instance
- `src/components/SceneStepPanel.tsx` — 1 instance (if present)

Add import in each: `import { GenerateSpinner } from './ui/GenerateSpinner'`

**Do NOT replace** the small CSS-border spinners (`animate-spin rounded-full border-2 border-zinc-300 border-t-*`).
Those are inline buttons with specific colors per-context. Leave them.

---

## Verification

After making all changes, run:

```bash
npx tsc --noEmit
```

Zero TypeScript errors expected. No runtime changes — this is pure structural.

Also visually spot-check these pages to confirm nothing changed:
1. Dashboard (VideoCard progress bars)
2. Workflow view — step 1 (Campaign Brief), step 3 (Song Lyrics), step 4 (Music)
3. Step sidebar step icons
