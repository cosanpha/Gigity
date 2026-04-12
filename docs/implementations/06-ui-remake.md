# 06 — UI Remake: Match Live Site to HTML Designs

**Reference designs:** `docs/designs/dashboard.html`, `docs/designs/workflow-view.html`, `docs/designs/brand-setup.html`

Each chunk below is fully independent and safe to run in a separate Cursor agent session.
No chunk depends on another being done first (they touch different files).

---

## Chunk A — BrandSwitcher pill redesign

**Files to edit:** `src/components/BrandSwitcher.tsx`, `src/components/Navbar.tsx`

### What to change

**BrandSwitcher.tsx** — the trigger button currently looks like a rectangle (`rounded-[6px] bg-zinc-50`).
The design wants a pill (`rounded-full`) with:

- A 6×6px orange dot (`bg-orange-500 rounded-full`)
- Brand name (max-w truncated)
- A `▾` chevron (or keep the LucideChevronDown icon)

Change the trigger button classes from:

```
rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-[5px] text-[13px] text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100
```

to:

```
flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[12px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-200
```

Add an orange dot span BEFORE the brand name inside the button:

```tsx
<span className="h-[6px] w-[6px] shrink-0 rounded-full bg-orange-500" />
<span className="max-w-[180px] truncate">{active?.name}</span>
<LucideChevronDown size={12} className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
```

The dropdown panel itself is fine — no changes needed there.

**Navbar.tsx** — when showing a single brand (no switcher), the static pill also needs to be `rounded-full`:

Find the span that shows brandName when `showSwitcher` is false:

```tsx
<span className="rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[12px] font-medium text-zinc-600">
```

This already looks correct per previous edits — verify it reads `rounded-full` (not `rounded-[6px]`). If not, fix it.

Also verify the navbar `gap` between logo area and brand pill is `gap-2.5` and there is a `<span className="h-4 w-px bg-zinc-200" />` divider between logo text and the brand pill/switcher.

---

## Chunk B — Dashboard filter bar + EmptyState redesign

**Files to edit:** `src/app/page.tsx`, `src/components/EmptyState.tsx`

### What to change

**1. Dashboard filter bar (new feature)**

The design has filter tabs (All / In progress / Completed) and a search input above the project list.
This requires making the project list client-interactive. The cleanest approach:

Create a new file `src/components/DashboardProjectList.tsx` (client component):

```tsx
'use client'

import { useState } from 'react'
import { VideoCard } from './VideoCard'
import { EmptyState } from './EmptyState'
import { WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'

type DashboardProject = {
  _id: string
  title: string
  status: 'in_progress' | 'completed'
  steps: Array<{
    stepNumber: number
    status: 'pending' | 'generating' | 'done'
  }>
  createdAt: string
}

type FilterTab = 'all' | 'in_progress' | 'completed'

interface DashboardProjectListProps {
  projects: DashboardProject[]
  brandProfileId: string
}

export function DashboardProjectList({
  projects,
  brandProfileId,
}: DashboardProjectListProps) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const filtered = projects.filter(p => {
    if (filter === 'in_progress' && p.status !== 'in_progress') return false
    if (filter === 'completed' && p.status !== 'completed') return false
    if (
      search.trim() &&
      !p.title.toLowerCase().includes(search.trim().toLowerCase())
    )
      return false
    return true
  })

  const inProgress = filtered.filter(p => p.status === 'in_progress')
  const completed = filtered.filter(p => p.status === 'completed')

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2">
        {(['all', 'in_progress', 'completed'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full border px-3 py-1 text-[13px] transition-all ${
              filter === tab
                ? 'border-zinc-200 bg-zinc-100 font-medium text-zinc-950'
                : 'border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'
            }`}
          >
            {tab === 'all'
              ? 'All'
              : tab === 'in_progress'
                ? 'In progress'
                : 'Completed'}
          </button>
        ))}
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Search videos…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-[200px] rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-950 transition-colors outline-none placeholder:text-zinc-400 focus:border-zinc-300"
        />
      </div>

      {filtered.length === 0 && projects.length === 0 ? (
        <EmptyState brandProfileId={brandProfileId} />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-zinc-400">
          No videos match your filter.
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                  In progress
                </span>
                <span className="flex-1 border-t border-zinc-200" />
              </div>
              <div className="flex flex-col gap-[6px]">
                {inProgress.map(p => (
                  <VideoCard
                    key={String(p._id)}
                    project={p}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                  Completed
                </span>
                <span className="flex-1 border-t border-zinc-200" />
              </div>
              <div className="flex flex-col gap-[6px]">
                {completed.map(p => (
                  <VideoCard
                    key={String(p._id)}
                    project={p}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
```

**2. Update `src/app/page.tsx`** to use `DashboardProjectList`:

Remove the existing in-progress/completed sections and the `projects.length === 0` EmptyState block.
Replace the whole projects section (below the page header `<div>`) with:

```tsx
import { DashboardProjectList } from '@/components/DashboardProjectList'

{
  /* Replace the existing project sections: */
}
;<DashboardProjectList
  projects={projects}
  brandProfileId={activeBrandId}
/>
```

The page header `<div className="mb-7 flex items-start justify-between gap-4">` stays unchanged.

**3. EmptyState.tsx** — match design (dashed border card with orange icon):

Replace the current content with:

```tsx
export function EmptyState({ brandProfileId }: EmptyStateProps) {
  return (
    <div className="rounded-[8px] border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center">
      <div className="mx-auto mb-4 flex h-[40px] w-[40px] items-center justify-center rounded-[6px] border border-orange-200 bg-orange-50 text-[18px]">
        🎬
      </div>
      <h3 className="text-[15px] font-semibold text-zinc-950">No videos yet</h3>
      <p className="mx-auto mt-1.5 mb-5 max-w-[300px] text-[13px] text-zinc-500">
        Create your first video and Gigity will guide you through all{' '}
        {WORKFLOW_TOTAL_STEPS} steps — from campaign brief to publish.
      </p>
      <NewVideoModal brandProfileId={brandProfileId} />
    </div>
  )
}
```

---

## Chunk C — VideoCard meta third segment (current step name)

**Files to edit:** `src/components/VideoCard.tsx`, `src/lib/workflow-templates.ts`

### What to change

The design shows a third meta segment: the name of the current step.
For example: `Started today · Step 4 of 9 · Music generation`

**Step 1 — export step titles from workflow-templates.**

Open `src/lib/workflow-templates.ts`. Find the array of step definitions (they have `stepNumber`, `title`, `tool` etc).
Export a helper:

```ts
export function getStepTitle(stepNumber: number): string {
  return WORKFLOW_STEPS.find(s => s.stepNumber === stepNumber)?.title ?? ''
}
```

(Use whatever the actual array variable name is in that file.)

**Step 2 — update VideoCard.tsx.**

In the `VideoCard` component, currently `doneCount` is computed. The current active step is `doneCount + 1` (for in-progress projects).

Add import at top:

```tsx
import { getStepTitle } from '@/lib/workflow-templates'
```

Inside the component, compute:

```tsx
const currentStepNumber = doneCount + 1
const currentStepTitle =
  project.status === 'in_progress' ? getStepTitle(currentStepNumber) : null
```

Update the meta line from:

```tsx
{
  project.status === 'completed'
    ? `All ${WORKFLOW_TOTAL_STEPS} steps done`
    : `Step ${doneCount + 1} of ${WORKFLOW_TOTAL_STEPS}`
}
```

to:

```tsx
{
  project.status === 'completed' ? (
    `All ${WORKFLOW_TOTAL_STEPS} steps done`
  ) : (
    <>
      {`Step ${currentStepNumber} of ${WORKFLOW_TOTAL_STEPS}`}
      {currentStepTitle && (
        <>
          {' · '}
          {currentStepTitle}
        </>
      )}
    </>
  )
}
```

---

## Chunk D — LLMStepPanel: section tag + response card + approved banner

**Files to edit:** `src/components/LLMStepPanel.tsx`

### What to change

**1. Section tag ("✦ AI Output")**

In the design, before the response card there is an orange pill tag:

```
✦ AI Output
```

Style: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-semibold text-orange-600 uppercase tracking-wide mb-3`

Add this tag immediately before the `<ResponseBlocks>` / response rendering in both:

- State 3 (done / approved) — before `<ResponseBlocks content={state.llmResponse!} />`
- State 4 (pending with result) — before the `{state.llmResponse && ...}` block

The tag JSX:

```tsx
<div className="mb-3 inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-orange-600 uppercase">
  ✦ AI Output
</div>
```

**2. Approved state banner**

The design shows a green pill banner with a checkmark circle, "Approved" text, and "Re-open" link on the right.

Find the "State 3: Approved / done" section. Replace the current approved header:

```tsx
<div className="mb-4 flex items-center justify-between">
  <div className="flex items-center gap-2 text-[13px] font-medium text-green-600">
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green-500 text-[11px] text-white">
      ✓
    </span>
    Approved
  </div>
  {onReopen && (
    <button
      onClick={onReopen}
      className="..."
    >
      Re-open
    </button>
  )}
</div>
```

Replace with a green banner card matching the design:

```tsx
<div className="mb-4 flex items-center gap-2 rounded-[6px] border border-green-200 bg-green-50 px-4 py-2">
  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
    ✓
  </span>
  <span className="text-[13px] font-medium text-green-600">Approved</span>
  {onReopen && (
    <button
      onClick={onReopen}
      className="ml-auto rounded-[4px] px-2 py-0.5 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
    >
      Re-open
    </button>
  )}
</div>
```

**3. Step header description**

The design shows a `step-desc` paragraph below the step title. Currently LLMStepPanel only shows the step title. If `stepDef.description` exists in the StepDefinition type, add it:

After `<h2 className="text-[18px] font-semibold...">`, add:

```tsx
{
  stepDef.description && (
    <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
      {stepDef.description}
    </p>
  )
}
```

(Only add this if `StepDefinition` has a `description` field — check `src/lib/workflow-templates.ts`. Skip if not present.)

**4. Generate button sizing**

The design has the generate button as `padding: 10px 28px` (larger than current `px-6 py-2.5`). Update:

```tsx
className =
  'rounded-[6px] bg-orange-500 px-7 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-orange-600'
```

---

## Chunk E — Sidebar: "Steps" header label

**Files to edit:** `src/components/StepSidebar.tsx`

### What to change

The design has a `sidebar-header` section at the top of the sidebar with the label "STEPS" in uppercase zinc-400.

Currently the sidebar has no header — it goes straight to the step list.

Add a header above the `<div className="flex-1 overflow-y-auto py-2">` list:

```tsx
{
  /* Sidebar header */
}
;<div className="border-b border-zinc-200 px-4 py-3">
  <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
    Steps
  </span>
</div>
```

Place it right inside the `<aside>` element, before the flex-1 scroll container.

Also check that the step item padding matches design (`padding: 9px 14px`). Current is `px-4 py-2.5` = `16px 10px`. Update to `px-[14px] py-[9px]` to match.

The step label font-weight for the active step should be 600. Currently active step uses `text-orange-700` — add `font-semibold` to the active label:

```tsx
<span className="min-w-0 truncate leading-tight font-semibold">
```

But only for the active step. The step label `<span>` is the same for all steps. You need to conditionally apply bold:

```tsx
<span className={`min-w-0 truncate leading-tight ${isActive ? 'font-semibold' : ''}`}>
```

---

## Chunk F — Brand form page redesign

**Files to edit:** `src/app/brand/new/page.tsx`, `src/app/brand/[id]/edit/page.tsx`, `src/components/BrandForm.tsx`

### What to change

The design (`brand-setup.html`) shows:

- `bg-zinc-50` page background
- Page body centered at 640px max-width
- Page header (h1 + subtitle) above a white form card
- Form card has `rounded-[8px] border border-zinc-200 bg-white overflow-hidden`
- Form is split into sections ("Identity", "Platforms") separated by `border-b border-zinc-200`
- Platform chips: rectangular (`rounded-[6px]`), not solid orange when selected — instead `border-orange-400 bg-orange-50 text-orange-700` with a small checkbox
- Input focus ring: `border-orange-400 box-shadow: 0 0 0 3px rgba(251,146,60,0.12)` (use `focus:ring-[3px] focus:ring-orange-100 focus:border-orange-400`)

**1. Page files (`brand/new/page.tsx` and `brand/[id]/edit/page.tsx`)**

Change `max-w-[780px]` to `max-w-[640px]`.

Add `bg-zinc-50 min-h-screen` to the `<main>` element.

The back link `← Back` style: `text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors`

**2. BrandForm.tsx — form card wrapper**

Wrap the form `<form>` content in a card:

```tsx
<form
  onSubmit={handleSubmit}
  className="max-w-[640px]"
>
  <div className="overflow-hidden rounded-[8px] border border-zinc-200 bg-white">
    {/* Identity section */}
    <div className="border-b border-zinc-200 p-6">
      <p className="mb-5 text-[12px] font-semibold tracking-wider text-zinc-500 uppercase">
        Identity
      </p>
      {/* Name, Logo URL, Description, Target Audience fields */}
    </div>

    {/* Platforms section */}
    <div className="border-b border-zinc-200 p-6">
      <p className="mb-5 text-[12px] font-semibold tracking-wider text-zinc-500 uppercase">
        Platforms
      </p>
      {/* Tone chips + Platform chips */}
    </div>

    {/* Example URLs section */}
    <div className="p-6">
      <p className="mb-5 text-[12px] font-semibold tracking-wider text-zinc-500 uppercase">
        References
      </p>
      {/* Example video URLs */}
    </div>
  </div>

  {/* Submit button — outside card, below */}
  <div className="mt-4 flex justify-end">
    <button
      type="submit"
      disabled={saving}
      className="rounded-[6px] bg-orange-500 px-5 py-2 text-[13px] font-medium text-white hover:bg-orange-600 disabled:opacity-60"
    >
      {saving ? 'Saving…' : 'Save brand'}
    </button>
  </div>
</form>
```

**3. BrandForm.tsx — input focus ring**

All inputs and textareas: add `focus:ring-[3px] focus:ring-orange-100 focus:border-orange-400 focus:outline-none`.

Replace the existing focus classes (`focus:border-orange-400 focus:outline-none`) with the full version including the ring.

**4. BrandForm.tsx — platform/tone chips**

Change chip selected state from solid orange background to outlined orange (matching design):

Currently: `border-orange-400 bg-orange-500 text-white`
Change to: `border-orange-400 bg-orange-50 text-orange-700 font-medium`

Also change chips from `rounded-full` to `rounded-[6px]` to match the design's rectangular chips.

Add a small checkbox indicator on selected chips:

```tsx
<button ... className={`flex items-center gap-1.5 rounded-[6px] border px-3 py-[6px] text-[13px] transition-colors ${
  selectedPlatforms.has(p)
    ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium'
    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
}`}>
  <span className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border text-[9px] ${
    selectedPlatforms.has(p)
      ? 'border-orange-500 bg-orange-500 text-white'
      : 'border-zinc-300'
  }`}>
    {selectedPlatforms.has(p) ? '✓' : ''}
  </span>
  {p}
</button>
```

Apply the same chip changes to the Tone chips section.

