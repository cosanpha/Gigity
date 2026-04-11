# Gigity — Full Codebase Review

**Reviewed:** 2026-04-11
**Branch:** main
**Reviewer:** /qa (Claude Code)
**Scope:** All files in `src/` — models, API routes, lib, components, pages

---

## Summary

The implementation is in solid shape for a V1 personal tool. The data model, API structure, interpolation engine, and LLM builder are all well-constructed and match the plans. The workflow client is complete.

There are **5 bugs** that will cause incorrect behavior in production, **4 medium issues** that are not correctness bugs but will cause friction or future problems, and **3 minor cleanup items**.

---

## Bugs

These will cause wrong behavior. Fix before first use.

---

### BUG-001 — Dashboard never loads projects (always shows empty)

**File:** [src/app/page.tsx:16](../../../src/app/page.tsx#L16)

```ts
// Line 16 — hard-coded empty array, never queries VideoProject
const projects: any[] = []
```

**Impact:** The dashboard always shows "0 projects" and the empty state, even if the user has created projects. The `VideoProject` model is already built and imported elsewhere, so this is not a `// TODO until model exists` situation anymore — it's just not wired up.

**Fix:**

```ts
import VideoProject from '@/models/VideoProject'

// Replace line 16 with:
const projects = await VideoProject.find({ brandProfileId: brand._id })
  .sort({ createdAt: -1 })
  .lean()
```

---

### BUG-002 — Unsafe `data.choices[0]` access in `callLLM`

**File:** [src/lib/llm.ts:98](../../../src/lib/llm.ts#L98)

```ts
return data.choices[0].message.content as string
```

**Impact:** If the OpenAI API returns an empty `choices` array (content filter, rate limit edge case, or model error), this throws `TypeError: Cannot read properties of undefined (reading 'message')`. The error propagates as an unhandled exception, not a clean 502.

**Fix:**

```ts
const content = data.choices?.[0]?.message?.content
if (!content) throw new Error('LLM returned empty response')
return content as string
```

---

### BUG-003 — `{{platform}}` in step 11 instruction is never interpolated

**File:** [src/lib/workflow-templates.ts:231](../../../src/lib/workflow-templates.ts#L231)

```ts
instruction: `Publish your video to your platforms.

Target platforms: {{platform}}
```

**File:** [src/components/ExternalStepPanel.tsx:127-128](../../../src/components/ExternalStepPanel.tsx#L127-L128)

```tsx
<p className="text-sm leading-relaxed whitespace-pre-line text-zinc-700">
  {stepDef.instruction}{' '}
  {/* no interpolation — {{platform}} appears as literal text */}
</p>
```

**Impact:** Step 11 shows literal `{{platform}}` instead of the user's actual platforms (e.g. "TikTok, YouTube Shorts").

**Fix:** Either interpolate in `ExternalStepPanel` or at the point of rendering:

```tsx
// In ExternalStepPanel, pass brand context and interpolate
import { interpolate } from '@/lib/interpolate'

// Add brandCtx prop: { platform: string }
const instruction = interpolate(stepDef.instruction ?? '', { platform: brandCtx.platform })

<p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
  {instruction}
</p>
```

Alternatively, change the step 11 instruction template to not use `{{}}` syntax, since only step 11 needs this.

---

### BUG-004 — DELETE brand does not check for active projects

**File:** [src/app/api/v1/brand/[id]/route.ts:56-72](../../../src/app/api/v1/brand/%5Bid%5D/route.ts#L56-L72)

```ts
// The VideoProject check is commented out — the guard never runs
// const inUse = await VideoProject.exists({ brandProfileId: id })
// if (inUse) { return 409 }
```

**Impact:** Deleting a brand that has active VideoProjects orphans those projects. Navigating to an orphaned project throws a 404 on brand lookup (`brand/[id]/edit`) and crashes the workflow page.

**Fix:** The `VideoProject` model and import are already in the file (commented out at line 4). Uncomment the import and the guard block.

---

### BUG-005 — `@/components/` import has no barrel export (`index.ts`)

**File:** [src/app/page.tsx:1](../../../src/app/page.tsx#L1)

```ts
import { NewVideoModal } from '@/components/'
```

**Impact:** TypeScript resolves `@/components/` to `src/components/index.ts` which does not exist. This is a compilation error. `bun dev` may silently resolve it in some cases, but `bun build` and strict TypeScript will fail.

**Fix:** Either add `src/components/index.ts` that re-exports all components:

```ts
export { BrandForm } from './BrandForm'
export { EmptyState } from './EmptyState'
export { ExternalStepPanel } from './ExternalStepPanel'
export { LLMStepPanel } from './LLMStepPanel'
export { Navbar } from './Navbar'
export { NewVideoModal } from './NewVideoModal'
export { StepProgressBar } from './StepProgressBar'
export { StepSidebar } from './StepSidebar'
export { VideoCard } from './VideoCard'
export { WorkflowClient } from './WorkflowClient'
```

Or fix the import to use the direct path: `import { NewVideoModal } from '@/components/NewVideoModal'`.

---

## Medium Issues

Not immediate crashes, but will cause friction or future problems.

---

### MED-001 — `brand` prop declared but never used in `WorkflowClient`

**File:** [src/components/WorkflowClient.tsx:18-23](../../../src/components/WorkflowClient.tsx#L18-L23)

```ts
interface WorkflowClientProps {
  project: { _id: string; steps: any[] }
  brand: { name: string }    // declared
  stepDefs: StepDefinition[]
}

export function WorkflowClient({ project, stepDefs }: WorkflowClientProps) {
  // `brand` not destructured — never used
```

**Impact:** The brand name and platform context are not available in the client component. This blocks BUG-003's fix (interpolating `{{platform}}` in step 11). Also the workflow header could show the brand name.

**Fix:** Destructure `brand` from props. You'll need it for BUG-003 regardless.

---

### MED-002 — No error handling on brand fetch in edit page

**File:** [src/app/brand/[id]/edit/page.tsx:15-19](../../../src/app/brand/%5Bid%5D/edit/page.tsx#L15-L19)

```ts
useEffect(() => {
  fetch(`/api/v1/brand/${id}`)
    .then(r => r.json())
    .then(setInitialData)
  // no .catch() — a 404 or network error leaves the user on "Loading..." forever
}, [id])
```

**Impact:** If the brand ID is invalid or the network blips, the page shows "Loading..." indefinitely with no way to recover.

**Fix:**

```ts
useEffect(() => {
  fetch(`/api/v1/brand/${id}`)
    .then(r => {
      if (!r.ok) throw new Error('Not found')
      return r.json()
    })
    .then(setInitialData)
    .catch(() => router.push('/'))
}, [id])
```

---

### MED-003 — `validateUrls` duplicated in two route files

**Files:**

- [src/app/api/v1/brand/route.ts:6-24](../../../src/app/api/v1/brand/route.ts#L6-L24)
- [src/app/api/v1/brand/[id]/route.ts:9-27](../../../src/app/api/v1/brand/%5Bid%5D/route.ts#L9-L27)

Identical 19-line function copy-pasted between the two brand route files. If the URL validation logic changes (e.g. adding support for `data:` URLs), you'll update one and miss the other.

**Fix:** Extract to a shared location — either a private helper in `src/lib/brand-validation.ts` or at the top of whichever file is considered canonical, with a re-export. Given the project rules (no utilities for one-time use), since this function is used in two files it qualifies for extraction.

---

### MED-004 — `console.info` left in version route

**File:** [src/app/api/(system)/version/route.ts:6](<../../../src/app/api/(system)/version/route.ts#L6>)

```ts
console.info('- Version -')
```

**Impact:** Every request to `/api/system/version` logs to stdout in production. Minor noise but the project rules explicitly say no `console.log` statements.

**Fix:** Remove the line.

---

## Minor

Cleanup items, no behavioral impact.

---

### MIN-001 — `formatRelativeDate` duplicated

**Files:**

- [src/app/page.tsx:59-64](../../../src/app/page.tsx#L59-L64)
- [src/components/VideoCard.tsx:65-71](../../../src/components/VideoCard.tsx#L65-L71)

Exact same 6-line helper in both files.

---

### MIN-002 — Dead CSS in `globals.css`

**File:** [src/app/globals.css](../../../src/app/globals.css)

Two blocks that are never referenced in any component:

1. `.dark { ... }` block (lines 101-133) — dark mode variables from scaffold. The app has no dark mode toggle.
2. `.trans-200`, `.trans-300`, `.trans-500` custom utilities (lines 155-163) — components use Tailwind's `transition-colors` directly, not these classes.

---

### MIN-003 — Scaffold imports in `globals.css`

**File:** [src/app/globals.css:8-49](../../../src/app/globals.css#L8-L49)

The `@theme inline` block contains `--color-sidebar-*`, `--color-chart-*`, `--color-popover-*`, and other shadcn/CVA token aliases that aren't used in this project. These are harmless but are scaffolding leftovers that could confuse future contributors.

---

## What's Well Done

Worth naming explicitly so future modifications don't break what works.

**Data model** (`VideoProject.ts`, `BrandProfile.ts`) — clean Mongoose schemas with `_id: false` on embedded documents, the re-registration guard in both models, `timestamps: true`, proper enum constraints. Nothing to change.

**`connectDB`** (`lib/db.ts`) — the singleton pattern using `global._mongooseConn` is correct for Next.js hot-reload. Proper null check and error message.

**`interpolate`** (`lib/interpolate.ts`) — the `KNOWN_KEYS` allowlist is good. Unknown variables pass through unchanged rather than being silently dropped, which makes typos in templates debuggable.

**`buildSystemMessage` + `buildMessages`** (`lib/llm.ts`) — clean separation. System message is recomputed, not stored. Message ordering (system → user prompt → conversation history → follow-up) is correct.

**Generate route** (`steps/[n]/generate/route.ts`) — sets `status: 'generating'` before the API call so the UI gets immediate feedback, resets on error. The step ordering guard is correct.

**Approve route** (`steps/[n]/approve/route.ts`) — properly idempotent. Steps 6/9 URL requirement enforced server-side. Step 11 sets project `status: completed`.

**`WorkflowClient` generate/approve handlers** — optimistic UI update on generate (sets generating immediately before the fetch), then patches from the response. `approve` advances `activeStep` client-side so the sidebar updates instantly.

**`LLMStepPanel` 4 states** — empty, generating, has-result, and done are all handled. Conversation thread renders correctly. Retry clears history correctly.

**Test files** — `interpolate.test.ts` and `llm.test.ts` cover the meaningful cases. The Bun mock approach for `server-only` and env constants is correct.

---

## Fix Priority

| #           | Issue                                        | Severity | Effort             |
| ----------- | -------------------------------------------- | -------- | ------------------ |
| BUG-001     | Dashboard never loads projects               | Critical | ~10 min            |
| BUG-005     | Missing `@/components/` barrel export        | Critical | ~5 min             |
| BUG-002     | Unsafe `choices[0]` access                   | High     | ~5 min             |
| BUG-003     | `{{platform}}` not interpolated in step 11   | High     | ~15 min            |
| BUG-004     | DELETE brand doesn't guard active projects   | High     | ~5 min (uncomment) |
| MED-001     | `brand` prop unused in WorkflowClient        | Medium   | ~5 min             |
| MED-002     | No error handling on brand fetch (edit page) | Medium   | ~10 min            |
| MED-003     | `validateUrls` duplicated                    | Low      | ~10 min            |
| MED-004     | `console.info` in version route              | Low      | ~1 min             |
| MIN-001–003 | Duplicates + dead CSS                        | Cleanup  | ~15 min            |

---

## How to Use This File

This review is designed to be reused. To re-run:

1. **After each implementation sprint:** Add new findings in the same format under the relevant section.
2. **When fixing a bug:** Move its entry from Bugs to a new `## Fixed` section with the commit SHA.
3. **When adding new features:** Add a review pass for the new files and append findings.

Each entry uses a stable ID (`BUG-NNN`, `MED-NNN`, `MIN-NNN`) so you can reference them in commit messages:
`fix: BUG-001 — wire VideoProject query on dashboard`

---

_Generated by `/qa` — static code review (no browser testing, no live app required)_

---

## Fixed

| ID      | Issue                                                       | Fixed in                                                                     |
| ------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| BUG-005 | `@/components/` import had no barrel export                 | Already correct in `src/app/page.tsx` (direct path import)                  |
| BUG-001 | Dashboard never loads projects (hard-coded empty array)     | `src/app/page.tsx:16` — replaced with `VideoProject.find()`                 |
| BUG-002 | Unsafe `data.choices[0]` access in `callLLM`               | `src/lib/llm.ts:98` — optional chaining + empty-response throw              |
| BUG-003 | `{{platform}}` in step 11 instruction never interpolated    | `src/components/ExternalStepPanel.tsx` — added `brandCtx` prop + `interpolate()` |
| BUG-004 | DELETE brand does not check for active projects             | `src/app/api/v1/brand/[id]/route.ts` — uncommented VideoProject guard       |
| MED-001 | `brand` prop declared but never destructured in WorkflowClient | `src/components/WorkflowClient.tsx:23` — destructured + expanded type     |
| MED-002 | No error handling on brand fetch in edit page               | `src/app/brand/[id]/edit/page.tsx:15` — added `.catch(() => router.push('/'))` |
| MED-003 | `validateUrls` duplicated in two route files                | Extracted to `src/lib/brand-validation.ts`, imported in both routes         |
| MED-004 | `console.info` left in version route                        | `src/app/api/(system)/version/route.ts:5` — removed                        |
| MIN-001 | `formatRelativeDate` duplicated in `page.tsx` + `VideoCard` | Exported from `VideoCard.tsx`, removed copy from `page.tsx`                 |
| MIN-002 | Dead CSS: `.dark {}` block and `.trans-*` utilities         | `src/app/globals.css` — both blocks removed                                 |

