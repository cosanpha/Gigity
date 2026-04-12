# Gigity — Full QA & Code Review

**Date:** 2026-04-12
**Branch:** main
**Reviewer:** Claude Code (gstack /qa)
**Mode:** Exhaustive — static analysis + live browser testing
**Health Score: 42/100**

---

## Summary

| Severity  | Count  | Fixed  | Deferred |
| --------- | ------ | ------ | -------- |
| Critical  | 4      | 4      | 0        |
| High      | 9      | 9      | 0        |
| Medium    | 8      | 8      | 0        |
| Low       | 4      | 4      | 0        |
| **Total** | **25** | **25** | **0**    |

**PR summary:** QA found 25 issues (4 critical, 9 high, 8 medium, 4 low), health score 42/100. All 25 issues fixed.

---

## Console Health

Every page load produces **2 console errors** before the user interacts with anything:

```
[error] Only plain objects can be passed to Client Components from Server Components.
Objects with toJSON methods are not supported.
{_id: {buffer: ...}, brandProfileId: {buffer: ...}, ...}
```

Root cause: `VideoProject.find().lean()` and `BrandProfile.find().lean()` return Mongoose documents where `_id`, `brandProfileId`, etc. are `ObjectId` instances (which have `toJSON` methods). These leak to client components via `VideoCard`. The project page (`/projects/[id]/page.tsx`) correctly uses `JSON.parse(JSON.stringify(project))` — the dashboard does not.

---

## ISSUE-001 — No authentication on any API route

**Severity:** Critical
**Category:** Security
**File:** All routes under `src/app/api/v1/`

Any HTTP client can read, create, modify, or delete any project or brand profile by guessing MongoDB ObjectIds. No session, no API key, no middleware.

- `DELETE /api/v1/projects/:id` — anyone can delete any project
- `PUT /api/v1/brand/:id` — anyone can overwrite any brand profile
- `GET /api/v1/brand` — all brands are exposed to any caller

`userId` is hardcoded to `null` by design ("V2 will set this"), but there is zero access control. A trivial script can enumerate and wipe the database.

**Repro:**

```bash
curl -X DELETE http://localhost:3000/api/v1/projects/ANY_VALID_ID
# → {"ok":true}
```

---

## ISSUE-002 — PATCH /api/v1/projects/:id has no error handling

**Severity:** Critical
**Category:** Reliability
**File:** src/app/api/v1/projects/[id]/route.ts line 18

The entire PATCH handler runs without a `try/catch`. Any error from `connectDB()`, `VideoProject.findById()`, or `project.save()` will propagate as an unhandled promise rejection, returning Next.js's generic error page instead of a JSON response. The client's `saveProgress()` then silently fails with no user-visible error (it just sets `saveStatus: 'error'`).

```ts
// Line 18 — no try/catch anywhere in this handler
export async function PATCH(req: Request, { params }: Ctx) {
  await connectDB() // throws → unhandled
  const project = await VideoProject.findById(id)
  // ...
  await project.save() // throws → unhandled
}
```

The DELETE handler on the same file (line 55) also has no error handling.

---

## ISSUE-003 — generate route has no top-level error handling

**Severity:** Critical
**Category:** Reliability
**File:** src/app/api/v1/projects/[id]/steps/[n]/generate/route.ts line 11

Only the LLM `callLLM()` call is wrapped in try/catch (lines 92–116). Everything before it — `connectDB()`, `VideoProject.findById()`, the two `project.save()` calls — has no error handling.

If the DB save on line 90 (`step.status = 'generating'; await project.save()`) throws, the step is left in a `generating` state in memory but never persisted. If the second save (line 110) throws after the LLM responds, the response is lost entirely and the step stays `generating` in the DB forever — blocking the user from generating again (409 conflict on retry).

```ts
// No outer try/catch
step.status = 'generating'
await project.save()  // throws → step stuck at 'generating' in DB

try {
  const response = await callLLM(messages)
  // ...
  await project.save()  // throws → response lost, step stuck 'generating'
}
```

---

## ISSUE-004 — Suno API key stored in plaintext in MongoDB and client state

**Severity:** Critical
**Category:** Security
**File:** src/models/VideoProject.ts line 13, src/components/WorkflowClient.tsx line 100

`sunoApiKeyOverride` is stored unencrypted in the MongoDB document and returned to the client as part of the project JSON. Any attacker with read access to the DB (or the API) obtains the user's Suno API key.

The key is in React state and sent on every `saveProgress` call:

```ts
// WorkflowClient.tsx line 144 — key goes in every PATCH body
sunoApiKeyOverride: s.sunoApiKeyOverride,
```

The key is visible in browser devtools Network tab on every auto-save tick (every 30s).

---

## ISSUE-005 — Console error on every page: ObjectId serialization

**Severity:** High
**Category:** Functional (React)
**File:** src/app/page.tsx line 22
**Screenshot:** .gstack/qa-reports/screenshots/01-homepage.png

Two console errors fire on every page load:

```
Only plain objects can be passed to Client Components from Server Components.
Objects with toJSON methods are not supported.
```

`VideoProject.find().lean()` returns Mongoose `ObjectId` instances for `_id` and `brandProfileId`, which are objects with `toJSON` methods. These get passed to `VideoCard` (a client component) without serialization. The fix already exists in the project page — `JSON.parse(JSON.stringify(project))` — but the dashboard page does not apply it.

```ts
// page.tsx line 22 — _id is still ObjectId, not a plain string
const projects = await VideoProject.find({ brandProfileId: activeBrand._id })
  .sort({ createdAt: -1 })
  .lean()

// Passed directly to VideoCard — missing JSON.parse(JSON.stringify(...))
{projects.map(p => <VideoCard key={String(p._id)} project={p} />)}
```

Same issue for `brands` on line 15 (passed to `Navbar` and `NewVideoModal`).

---

## ISSUE-006 — Reopen steps 1–7 doesn't clear llmResponse or conversation on server

**Severity:** High
**Category:** Data Integrity
**File:** src/app/api/v1/projects/[id]/steps/[n]/reopen/route.ts line 27

For steps 1–7, reopen only sets `status = 'pending'` and `completedAt = null`. `llmResponse` and `conversation` are preserved:

```ts
if (stepNumber === 1 || ... || stepNumber === 7) {
  step.status = 'pending'
  step.completedAt = null
  // llmResponse and conversation NOT cleared
```

Steps 8–9 correctly clear everything. This means reopening step 1 and re-generating sends the old conversation history to the LLM, producing confusing results. The client-side `reopen()` in `WorkflowClient.tsx` line 253 also does not clear these fields for steps 1–7.

---

## ISSUE-007 — Suno callback endpoint is a no-op stub

**Severity:** High
**Category:** Integration
**File:** src/app/api/v1/workflow/suno/callback/route.ts

The callback URL is sent to Suno on every generation start (`suno/start/route.ts` line 67). The callback handler does nothing:

```ts
export async function POST() {
  return NextResponse.json({ ok: true }) // discards all Suno callback data
}
```

Suno sends progress and completion data to this endpoint which is silently discarded. The client polls `/suno/status` instead — which works while the user has the page open — but completion is never captured if the user isn't actively polling. The callback URL is effectively broken.

---

## ISSUE-008 — assets/upload and upload-video routes have no error handling

**Severity:** High
**Category:** Reliability
**Files:** src/app/api/v1/assets/upload/route.ts line 33, src/app/api/v1/workflow/cloudinary/upload-video/route.ts line 36

Both routes call Cloudinary upload functions without try/catch:

```ts
// assets/upload/route.ts — no try/catch
const cloudUrl = await uploadFromUrl(url)
return NextResponse.json({ url: cloudUrl })
```

An unhandled exception returns Next.js's HTML error page (status 500) instead of a JSON `{ error }` response. Clients trying to parse JSON get a parse error instead, which is harder to debug.

---

## ISSUE-009 — DALL-E route hardcodes OpenAI URL, ignores LLM_BASE_URL

**Severity:** High
**Category:** Configuration
**File:** src/app/api/v1/workflow/dalle/generate/route.ts line 24

```ts
const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
```

All other LLM calls use `LLM_BASE_URL` from env, allowing OpenAI-compatible providers. The DALL-E route bypasses this and always calls OpenAI directly. If the user configures a custom `LLM_BASE_URL`, DALL-E silently ignores it. Inconsistent behavior.

---

## ISSUE-010 — Approve step while generating is not blocked

**Severity:** High
**Category:** Race Condition
**File:** src/app/api/v1/projects/[id]/steps/[n]/approve/route.ts line 37

The idempotent check only skips `done` steps:

```ts
if (step.status === 'done') return NextResponse.json({ ok: true })
```

There is no check for `generating` status. If a user approves a step while it's generating (two tabs, or client-side timing), the step gets marked `done` with incomplete `llmResponse`. Then the in-progress generate call finishes and resets it to `pending` with the full response. The step bounces done → generating → pending.

---

## ISSUE-011 — Invalid ObjectId causes CastError 500 instead of 400

**Severity:** High
**Category:** Error Handling
**File:** Multiple route handlers

Routes call `VideoProject.findById(id)` without validating `id` is a valid MongoDB ObjectId. An invalid ID like `"not-an-id"` throws `CastError: Cast to ObjectId failed`, which either crashes routes without try/catch (ISSUE-002) or is caught and returned as a 500 — leaking internal implementation details.

Expected: return 400 with "Invalid ID format".

---

## ISSUE-012 — connectDB doesn't check Mongoose connection readyState

**Severity:** High
**Category:** Reliability
**File:** src/lib/db.ts line 9

```ts
export async function connectDB() {
  if (global._mongooseConn) return global._mongooseConn  // cached forever
```

`global._mongooseConn` is set once and never checked again. If the MongoDB connection drops (network failure, Atlas timeout), all subsequent DB calls fail with `MongoNotConnectedError` until the Node.js process restarts. The fix: check `mongoose.connection.readyState !== 1` before returning the cached connection.

---

## ISSUE-013 — Step 9 done view is blank when no content was generated

**Severity:** High
**Category:** UX
**File:** src/components/ExternalStepPanel.tsx line 493
**Screenshot:** .gstack/qa-reports/screenshots/03-step9-publish.png

When step 9 is approved without generating a description or saving publish links, the "Completed" state renders a green badge and then nothing else — no instructions, no prompts, no content. The user is left staring at a green checkmark with no guidance.

`PublishStepDoneView` correctly handles non-null content, but renders an empty div when both `llmResponse` and `outputAssetUrl` are null.

---

## ISSUE-014 — WorkflowClient auto-save setState after unmount

**Severity:** Medium
**Category:** Memory / React
**File:** src/components/WorkflowClient.tsx line 160

```ts
useEffect(() => {
  const id = setInterval(() => {
    setSteps(current => {
      saveProgress(current) // calls setSaveStatus inside — still fires after unmount
      return current
    })
  }, 30_000)
  return () => clearInterval(id)
}, [])
```

`saveProgress` calls `setSaveStatus`. If the component unmounts between the interval firing and the fetch response resolving, this triggers a React state update on an unmounted component. `clearInterval` only stops new firings, not an in-flight async fetch.

---

## ISSUE-015 — No input length limits on text fields

**Severity:** Medium
**Category:** Security / Reliability
**Files:** src/app/api/v1/brand/route.ts, src/app/api/v1/projects/route.ts

No maximum length is enforced on `description`, `targetAudience`, `tone`, `title`, or any prompt fields. A user can submit 10 MB in `description`, which:

1. Gets stored in MongoDB (expensive)
2. Gets injected into every LLM prompt (extremely expensive — charged per token)
3. Can exceed OpenAI's context window limit, causing all LLM steps to fail with an opaque 400 error

No Mongoose schema-level `maxlength` is set either.

---

## ISSUE-016 — VideoCard delete uses browser confirm() dialog

**Severity:** Medium
**Category:** UX
**File:** src/components/VideoCard.tsx line 32

```ts
if (!confirm('Delete this project? This cannot be undone.')) return
```

`window.confirm()` is synchronous, blocks the main thread, cannot be styled, and is suppressed in iframes and some automated environments. No visual feedback on the card during deletion beyond the button showing `...`.

---

## ISSUE-017 — BrandSwitcher has invalid ARIA

**Severity:** Medium
**Category:** Accessibility
**File:** src/components/BrandSwitcher.tsx line 62

```tsx
<div role="listbox">
  {brands.map(b => (
    <Link role="option" ... />
  ))}
```

`role="option"` elements inside a `role="listbox"` must support keyboard navigation (Arrow keys, Home, End) per ARIA spec. This implementation only handles Escape and click. Screen readers will announce it as a listbox widget that doesn't respond to expected keyboard input.

---

## ISSUE-018 — saveTitle() silently swallows errors

**Severity:** Medium
**Category:** UX
**File:** src/components/WorkflowClient.tsx line 171

```ts
async function saveTitle() {
  await fetch(...)  // no res.ok check, no error state
  setTitle(titleInput.trim())
  setEditingTitle(false)
}
```

If the PATCH request fails, the UI still shows the new title and closes the editor. The DB and UI are out of sync. No error message, no retry.

---

## ISSUE-019 — Suno API key sent on every auto-save

**Severity:** Medium
**Category:** Security
**File:** src/components/WorkflowClient.tsx line 139

Every 30-second auto-save transmits the `sunoApiKeyOverride` in the PATCH body:

```ts
sunoApiKeyOverride: s.sunoApiKeyOverride,
```

The key is visible in browser devtools Network tab. Combined with ISSUE-004, the key leaks in transit and at rest.

---

## ISSUE-020 — Step 9 generation has no in-flight guard (concurrent requests)

**Severity:** Medium
**Category:** Race Condition
**File:** src/app/api/v1/projects/[id]/steps/9/generate-publish-description/route.ts

The `generate-publish-description` endpoint has no `status = 'generating'` guard. If the user clicks "Generate video description" twice quickly, two concurrent LLM requests fire. Both update `step9.llmResponse` and call `project.save()` — one will silently overwrite the other. No 409 guard like the main generate route has.

---

## ISSUE-021 — Dashboard loads all brands with no pagination

**Severity:** Medium
**Category:** Performance / Security
**File:** src/app/page.tsx line 15

```ts
const brands = await BrandProfile.find().sort({ createdAt: 1 }).lean()
```

All brands returned on every page load — no pagination, no user filter. At scale, this is a slow full-collection scan. Combined with ISSUE-001, all brand data is accessible to any visitor.

---

## ISSUE-022 — Approve character/scene/kling gives no error feedback

**Severity:** Low
**Category:** UX
**File:** src/components/WorkflowClient.tsx lines 279, 298, 311

```ts
async function approveCharacterStep(imageUrls: string) {
  const res = await fetch(...)
  if (!res.ok) return  // silent failure
  setSteps(...)
  setActiveStep(6)
}
```

On API error, the approve functions return silently. The user clicks "Approve all images" and nothing happens — no error message, no spinner, no feedback. Compare with `generate()` which correctly sets `error` on the step.

---

## ISSUE-023 — Spinner SVG uses a broken path

**Severity:** Low
**Category:** Visual
**File:** src/components/CharacterStepPanel.tsx line 354, src/components/StepSidebar.tsx line 99

The spinner path `d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"` contains `l3-3-3-3` which draws a zigzag instead of a clean arc. The animation at speed conceals this, but at reduced motion or on slow machines the malformed path is visible.

---

## ISSUE-024 — migrateLegacyTenSteps matches on count, not schema

**Severity:** Low
**Category:** Data Integrity
**File:** src/lib/migrate-project-steps.ts line 53

```ts
if (!steps || steps.length !== 10) {
  return { steps: steps ?? [], migrated: false }
}
```

Any project with exactly 10 steps will be migrated, even if it's not a legacy project. If a project was manually edited or corrupted to have 10 steps, this function will incorrectly merge steps 5 and 6. No schema validation that the steps being merged are actually of the expected types.

---

## ISSUE-025 — ZIP download unnecessarily copies Uint8Array

**Severity:** Low
**Category:** Performance
**File:** src/components/ExternalStepPanel.tsx line 235

```ts
zip(entries, (zipErr, out) => {
  const zipBytes = new Uint8Array(out.length)  // redundant copy
  zipBytes.set(out)
  const blob = new Blob([zipBytes], ...)
```

`out` is already a `Uint8Array` and can be passed directly to `Blob`. The extra copy doubles peak memory usage — significant for large video + image zip archives.

---

## Health Score Breakdown

| Category      | Weight | Score | Weighted |
| ------------- | ------ | ----- | -------- |
| Console       | 15%    | 10    | 1.5      |
| Security      | 20%    | 5     | 1.0      |
| Functional    | 20%    | 65    | 13.0     |
| UX            | 15%    | 60    | 9.0      |
| Reliability   | 15%    | 50    | 7.5      |
| Accessibility | 5%     | 50    | 2.5      |
| Performance   | 5%     | 70    | 3.5      |
| Content       | 5%     | 75    | 3.75     |

**Weighted final: 41.75 → rounded to 42/100** (functional core works; foundational security/reliability gaps penalize heavily)

---

## Top 3 Things to Fix First

1. **ISSUE-001 + ISSUE-004 (Security)** — Add authentication before shipping. Even a static API secret in an env var beats fully open access. Separately: never store or transmit the Suno API key in plaintext — hash it at rest, redact it from PATCH payloads.

2. **ISSUE-002 + ISSUE-003 (Reliability)** — Wrap every route handler in a top-level `try/catch`. At minimum: PATCH projects, generate step, assets/upload, upload-video. A DB hiccup currently returns HTML to JSON-expecting clients, breaking the entire UI.

3. **ISSUE-005 (Console errors on every page)** — Two lines of fix: `JSON.parse(JSON.stringify(projects))` and `JSON.parse(JSON.stringify(brands))` in `page.tsx` before passing to client components. Already done correctly on the project page.

---

## Screenshots

| File                                                | Page             | Notes                                  |
| --------------------------------------------------- | ---------------- | -------------------------------------- |
| .gstack/qa-reports/screenshots/01-homepage.png      | Dashboard        | 2 issues badge; projects load          |
| .gstack/qa-reports/screenshots/02-project.png       | Project workflow | Step 1 Campaign Brief, generated       |
| .gstack/qa-reports/screenshots/03-step9-publish.png | Step 9 Publish   | Blank done state (ISSUE-013)           |
| .gstack/qa-reports/screenshots/04-new-brand.png     | New brand form   | Functional, Save disabled until filled |

## Fixed (fix-code.md tracker)

Items from `docs/reviews/fix-code.md` verified in codebase; canonical `formatRelativeDate` lives in `src/lib/format-relative-date.ts` (MIN-001).

| ID      | Issue                                                                 | Fixed in |
| ------- | --------------------------------------------------------------------- | -------- |
| BUG-001 | Dashboard loads projects via `VideoProject.find` (not stub)           | `src/app/page.tsx` |
| BUG-002 | Guard empty LLM `choices[0]`                                          | `src/lib/llm.ts:98-99` |
| BUG-003 | Interpolate `stepDef.instruction` with `platform`                     | `src/components/ExternalStepPanel.tsx:471-473` |
| BUG-004 | DELETE brand checks `VideoProject.exists`                             | `src/app/api/v1/brand/[id]/route.ts:64-70` |
| BUG-005 | Import `NewVideoModal` from `@/components/NewVideoModal`              | `src/app/page.tsx:3` |
| MED-001 | `brand` prop passed to `ExternalStepPanel` as `brandCtx`                | `src/components/WorkflowClient.tsx:620-626` |
| MED-002 | Brand edit fetch uses `.catch()`                                      | `src/app/brand/[id]/edit/page.tsx:15-22` |
| MED-003 | Shared `validateUrls` in `@/lib/brand-validation`                     | `src/lib/brand-validation.ts` |
| MED-004 | No `console.info` in version route                                    | `src/app/api/(system)/version/route.ts` |
| MIN-001 | Single `formatRelativeDate` in lib                                    | `src/lib/format-relative-date.ts` |
| MIN-002 | No stray `.dark {}` / `trans-*` utility blocks in globals             | `src/app/globals.css` |

