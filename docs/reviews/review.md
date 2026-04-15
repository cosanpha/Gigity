# Gigity Code Review
**Date:** 2026-04-15  
**Branch:** main  
**Scope:** Last 5 commits (HEAD~5..HEAD) — 58 src files, ~5500 changed lines  
**Reviewer:** gstack /review

---

## Summary

Pre-Landing Review: **9 issues** (3 critical, 6 informational)

The feature work (brandLinks, per-platform publish copy, character/scene/Kling regeneration, responsive UI) is well-structured. The three critical issues are all auth-related or bypass the approval guard — none are subtle. Fix them before this gets more users.

---

## CRITICAL

### [P1] Unauthenticated brand read endpoints
**Files:** `src/app/api/v1/brand/route.ts:7`, `src/app/api/v1/brand/[id]/route.ts:6`

`GET /api/v1/brand` and `GET /api/v1/brand/[id]` have no `{ auth: true }`. Anyone with the app URL can enumerate every brand profile — including name, description, tone, platforms, example video URLs, and brand links — without a token.

The POST/PUT/DELETE endpoints are all auth-gated. The two read endpoints are not. Likely an oversight, not intentional.

**Fix:**
```ts
// brand/route.ts
export const GET = apiHandler(async () => { ... }, { auth: true })

// brand/[id]/route.ts
export const GET = apiHandler(async (_req, ctx) => { ... }, { auth: true })
```

---

### [P2] PATCH `/api/v1/projects/[id]` lets client mark any step as `done`
**File:** `src/app/api/v1/projects/[id]/route.ts:140-171`

The PATCH handler accepts `steps[i].status` from the client body and writes it directly to the DB. A client can send `{ steps: [{ status: 'done', ... }] }` and skip all approval-flow guards.

The `/approve` endpoint enforces: step ordering (N-1 must be done first), `llmResponse` presence for LLM steps, `outputAssetUrl` for steps 5/6/7, and the Suno audio-extension check for step 4. PATCH bypasses every single one.

The impact right now is limited (single-user, authenticated), but this is an unintended bypass that will cause corrupted project state if triggered accidentally from the client.

**Fix:** Strip `status: 'done'` from step payloads in PATCH — the approve endpoint is the only valid path to mark done:
```ts
// in the forEach loop, add:
const allowedPatchStatuses: StepPayload['status'][] = ['pending', 'generating']
if (!allowedPatchStatuses.includes(s.status)) return
project.steps[i].status = s.status
```

---

### [P2] Reopen step 4 leaves stale `sunoTaskId` — UI polls dead task every 3s
**File:** `src/app/api/v1/projects/[id]/steps/[n]/reopen/route.ts:28-29`

The simplified reopen sets only `status = 'pending'` and clears `completedAt`. The old code explicitly cleared `step.sunoTaskId = null` for step 4.

Now when step 4 is reopened, the old `sunoTaskId` stays. `MusicPromptStepPanel.tsx:354-368` starts a polling interval on mount whenever `sunoTaskId` is non-empty (`if (!taskId) return` is the only guard). On every page visit to step 4 post-reopen, it will start pounding the Suno API at 3-second intervals for a task that is finished or expired.

**Fix:**
```ts
// reopen/route.ts — restore the step-specific clear
step.status = 'pending'
step.completedAt = null
if (stepNumber === 4) {
  step.sunoTaskId = null
}
```

---

## INFORMATIONAL

### [P2] `suggest-title/route.ts` returns 500 on malformed JSON body
**File:** `src/app/api/v1/projects/suggest-title/route.ts:19`

The line changed from `req.json().catch(() => ({}))` to `req.json()` (no catch). If the request arrives with an empty body, wrong Content-Type, or bad JSON, it throws. The `apiHandler` wrapper catches that and returns `{ error: 'Internal server error' }` with status 500, instead of the old 400 with a meaningful message.

**Fix:** Restore the catch:
```ts
const body = await req.json().catch(() => ({}))
const brandProfileId = body?.brandProfileId as string | undefined
```

---

### [P3] `normalizeForSimilarity` and `jaccardSimilarity` copy-pasted in 3 route files
**Files:** `src/app/api/v1/projects/[id]/steps/[n]/regenerate-character-prompt/route.ts:1-15`, `regenerate-kling-prompt/route.ts:1-15`, `regenerate-scene-prompt/route.ts:1-15`

Identical implementations. If the similarity threshold or normalization logic changes, it needs to be updated in three places.

**Fix:** Extract to `src/lib/jaccard-similarity.ts` and import in all three routes.

---

### [P3] `llmModelForWorkflowGenerateStep` throws unchecked for unknown step numbers
**File:** `src/constants/workflow-llm-models.ts:13-16`

```ts
export function llmModelForWorkflowGenerateStep(stepNumber: number): string {
  const key = WORKFLOW_GENERATE_STEP_MODEL[stepNumber]
  if (!key) {
    throw new Error(`No LLM model configured for workflow step ${stepNumber}`)
  }
  return AI_MODELS[key].name
}
```

Steps 8 and 9 are not in `WORKFLOW_GENERATE_STEP_MODEL`. Step 8 is blocked by the `external_instruction` guard in the generate route. Step 9 has a dedicated endpoint. But the throw would propagate outside the `try/catch` in `generate/route.ts` (it's called on line 113, the try starts on line 103 — actually they're inside the try block, so it returns 502 not 500). Still, a future step addition or refactor could silently break this.

**Fix:** Return a safe default or throw with a clear developer message that surfaces earlier (e.g., during module load), not at request time.

---

### [P3] No per-URL length limit on `brandLinks` in LLM system message
**File:** `src/lib/llm.ts:52-54`

Brand links are joined and injected verbatim into every LLM system message:
```ts
const links = brand.brandLinks ?? []
if (links.length > 0) {
  lines.push(`Brand links (site, app stores, etc.): ${links.join(', ')}`)
}
```

There's no cap on the number of links or individual URL length. A brand with 20 links to 500-character URLs adds 10,000 tokens to every single generate call. `brand-validation.ts` only checks the `https?://` prefix, not length.

**Fix:** Cap in validation:
```ts
// in brand-validation.ts
for (const url of body.brandLinks ?? []) {
  if (url.length > 2000) {
    return { error: 'brandLinks URL too long (max 2000 characters)', field: 'brandLinks' }
  }
}
```
And add a count cap (e.g. max 10 links) in the brand schema.

---

### [P3] `publishPlatforms` stored as `Schema.Types.Mixed` — no schema enforcement
**File:** `src/models/VideoProject.ts:26` (WorkflowStepSchema)

```ts
publishPlatforms: { type: Schema.Types.Mixed, default: null },
```

`Mixed` bypasses Mongoose validation entirely. Any object shape can be written. The type-level contract is `Record<string, string> | null` but that's only enforced in TypeScript, not at the DB boundary.

**Fix:** Use a stricter schema or at minimum validate the shape in the PATCH handler before writing (a `typeof v === 'string'` check per value is already there — but it only runs via the step-by-step update path, not if Mixed is written directly by other code paths).

---

### [P3] `GET /api/v1/projects/:id` exposes full `conversation` history
**File:** `src/app/api/v1/projects/[id]/route.ts:56-64`

The GET response includes all `conversation` arrays for every step. These contain the full LLM prompts and responses. Only `sunoApiKeyOverride` is scrubbed. If the project ever contains sensitive data in follow-up messages (unlikely but possible), it would be exposed.

This is low-risk given the single-user model and the existing auth gate. Logging it for awareness — worth revisiting if the app becomes multi-user.

---

## Prior Learning Applied

**gigity-auth-empty-string-footgun** (confidence 10/10, observed 2026-04-12) — `API_SECRET ?? ''` in `env.server.ts` makes the default state unauthenticated in dev. The two new unauthenticated GET endpoints (P1 above) are a separate issue but the pattern is consistent: auth defaults to open, not closed. Both need to be fixed.

---

## What's Good

- The `generate/route.ts` concurrency guard (`status === 'generating'` → 409) is solid.
- `sunoApiKeyOverride` is properly nulled in the GET response.
- `validateUrls` covers `brandLinks` for https-prefix enforcement.
- The `jaccardSimilarity` dedup on regen prompts is a nice touch — prevents the LLM from returning the same wording twice.
- `normalizeNoEmDash` applied to all LLM output at the `callLLM` level — good global enforcement.
- The `PATCH` guard that skips `generating`-status steps prevents overwriting in-flight LLM state.

---

## Fix Priority

| Issue | Severity | Effort | Fix First? |
|-------|----------|--------|------------|
| Unauthenticated GET brand endpoints | P1 | 2 min | Yes |
| PATCH bypasses approve-flow guards | P2 | 10 min | Yes |
| Reopen step 4 leaves stale sunoTaskId | P2 | 2 min | Yes |
| suggest-title 500 on bad JSON | P2 | 1 min | Yes |
| Duplicate Jaccard functions | P3 | 10 min | No |
| llmModelForWorkflowGenerateStep throw | P3 | 5 min | No |
| brandLinks no length cap | P3 | 5 min | No |
| publishPlatforms Mixed schema | P3 | 10 min | No |
| conversation exposure in GET | P3 | — | Future |
