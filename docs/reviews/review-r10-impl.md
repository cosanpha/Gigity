# Gigity — R10 Implementation Code Review

**Date:** 2026-04-12
**Branch:** main (uncommitted changes)
**Reviewer:** Claude Code (gstack /review)
**Scope:** R10a (shared primitives) + R10b (text step panels) + R10c (API handler wrapper) + additional features (publish step, suggest-title, zip download)
**Diff size:** 57 files, 4202 insertions, 4235 deletions

---

## Scope Check

```
Scope Check: DRIFT DETECTED — new features shipped alongside the refactor
Intent:      R10 optimization: DRY violations, shared primitives, apiHandler wrapper
Delivered:   R10 complete + suggest-title endpoint, publish step (step 9), zip download,
             sessionStorage step persistence, sunoApiKeyOverride per-project, step reopen cleanup
Out of scope (not in R10 plan, still acceptable):
  - src/app/api/v1/projects/suggest-title/route.ts (new LLM endpoint)
  - src/app/api/v1/workflow/cloudinary/upload-image-file/route.ts (new upload endpoint)
  - src/app/api/v1/projects/[id]/steps/9/generate-publish-description/route.ts (new)
  - src/lib/publish-links.ts, src/components/ExternalStepPanel.tsx publish UI
  - sessionStorage step persistence in WorkflowClient
  - sunoApiKeyOverride per-project storage + redaction in page.tsx
Missing from R10 plan:
  - CharacterStepPanel local StepState type not fully cleaned (uses StepState from workflow-templates now — DONE)
  - KlingStepPanel still has no import of StepState (inherits via prop type) — acceptable
```

The new features are all coherent additions — they weren't in the R10 plan but they work together. Main issue is that the new routes were written in a different style than the refactored ones.

---

## Findings

### CRITICAL (must fix before shipping)

**[C1] (confidence: 10/10) `src/lib/auth.ts:10` — auth-bypass when `API_SECRET` is not set**

```ts
export const API_SECRET = process.env.API_SECRET ?? ''  // env.server.ts
// ...
if (!API_SECRET) return null  // auth.ts — SKIPS auth entirely
```

`process.env.API_SECRET ?? ''` gives an empty string when unset. `!''` is `true`. So every route with `{ auth: true }` — brand create/update/delete, project create/PATCH/delete, all step generate/approve/reopen — is **wide open** if `API_SECRET` is not configured in the deployment environment.

Fix option A (fail closed):
```ts
export function requireAuth(req: Request): NextResponse | null {
  if (!API_SECRET) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  ...
}
```

Fix option B (environment enforcement): Add startup check in `src/lib/db.ts` or a `src/lib/startup-check.ts` that throws if `API_SECRET` is not set in production (`process.env.NODE_ENV === 'production'`).

Option A is safer for production — it fails closed without breaking local dev intent. But it changes behavior. This is an ASK item.

---

**[C2] (confidence: 9/10) `src/app/api/v1/workflow/dalle/generate/route.ts` — no auth**

`apiHandler` is used but without `{ auth: true }`. Any unauthenticated caller can call the DALL-E endpoint and charge images to the developer's OpenAI key.

```ts
// current
export const POST = apiHandler(async (req: Request) => {

// fix
export const POST = apiHandler(async (req: Request) => {
  ...
}, { auth: true })
```

---

**[C3] (confidence: 9/10) `src/app/api/v1/workflow/cloudinary/upload-video/route.ts` — no auth**

Same pattern. Any caller can upload arbitrary video URLs to the developer's Cloudinary account.

Fix: add `{ auth: true }` to the `apiHandler` call.

---

**[C4] (confidence: 9/10) `src/app/api/v1/workflow/cloudinary/upload-image-file/route.ts` — no auth, not using apiHandler**

New file. Raw `export async function POST`. No auth, no `connectDB`. Anyone can upload files to Cloudinary.

Additionally: MIME type check uses `file.type` which is client-supplied and attacker-controlled. A client can set `Content-Type: image/jpeg` while sending an executable. Cloudinary typically handles this safely for images, but the server-side check provides no real protection.

Fix:
```ts
import { apiHandler } from '@/lib/api-handler'
// ...
export const POST = apiHandler(async (req: Request) => {
  // ... existing logic
}, { auth: true })
```

---

**[C5] (confidence: 9/10) `src/app/api/v1/assets/upload/route.ts` — no auth, SSRF risk**

Pre-existing file but not migrated to `apiHandler` and still has no auth. Accepts an arbitrary `url` param and proxies it to Cloudinary via `uploadFromUrl`. An unauthenticated attacker can make the server fetch any HTTP/HTTPS URL and upload it to Cloudinary — classic server-side request forgery (the server makes the fetch) combined with unlimited storage abuse.

Fix:
```ts
export const POST = apiHandler(async (req: Request) => {
  // ... existing logic
}, { auth: true })
```

For SSRF mitigation: validate the `url` param against an allowlist of trusted domains (Cloudinary, known CDNs) before fetching.

---

**[C6] (confidence: 9/10) `src/app/api/v1/projects/suggest-title/route.ts` — no auth, not using apiHandler**

New file. Raw `export async function POST`, no auth check. Any caller can:
1. Call the LLM and charge the cost to the developer's OpenAI key
2. Look up brand profiles by ID (MongoDB ObjectId — guessable in some scenarios)

Fix:
```ts
import { apiHandler } from '@/lib/api-handler'
// wrap everything in apiHandler with { auth: true }
export const POST = apiHandler(async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  // ... existing logic without the outer try/catch
}, { auth: true })
```

---

**[C7] (confidence: 8/10) `src/app/api/v1/workflow/suno/start/route.ts` — no auth**

Pre-existing. Raw `export async function POST`. Unauthenticated callers can:
1. Submit arbitrary lyrics/style to Suno at the server's SUNO_API_KEY cost
2. Pass their own `sunoApiKey` to test/validate it against the configured Suno provider

Fix: wrap with `apiHandler(..., { auth: true })`.

---

**[C8] (confidence: 8/10) `src/app/api/v1/workflow/suno/status/route.ts` — no auth**

Pre-existing. Raw `export async function GET`. Accepts `X-Suno-Api-Key` header from any caller and proxies to Suno.

Fix: wrap with `apiHandler(..., { auth: true })`.

---

### INFORMATIONAL

**[I1] (confidence: 9/10) `src/app/api/v1/workflow/suno/callback/route.ts` — no webhook signature verification**

The Suno callback is intentionally public (external webhook). But there is no HMAC, shared secret, or token validation. Any actor who knows or can guess a `taskId` can POST a spoofed completion with an arbitrary `audioUrl`, overwriting the project's step 4 audio output.

The current `taskId` guard (`project.steps.sunoTaskId === taskId`) is not a security control — taskIds are typically predictable (sequential IDs or UUIDs).

Fix: embed a random per-project token in the callbackUrl (e.g. `?token=<crypto.randomUUID stored on the project>`), validate it in the handler. Or use Suno's webhook signing if the provider supports it.

---

**[I2] (confidence: 7/10) `src/app/api/v1/workflow/suno/callback/route.ts:36` — non-atomic write**

```ts
if (step4?.sunoTaskId === taskId && !step4.outputAssetUrl) {
  step4.outputAssetUrl = audioUrl
  await project.save()
}
```

Read-check-write pattern without atomic update. Two near-simultaneous callbacks pass the `!step4.outputAssetUrl` check and both write — second wins. Unlikely in practice but possible with retry behavior.

Fix (atomic):
```ts
await VideoProject.findOneAndUpdate(
  { _id: project._id, 'steps.sunoTaskId': taskId, 'steps.3.outputAssetUrl': null },
  { $set: { 'steps.3.outputAssetUrl': audioUrl } }
)
```

---

**[I3] (confidence: 8/10) `src/app/api/v1/brand/route.ts:46` — mass assignment**

```ts
const profile = await BrandProfile.create(body)
```

The raw request body is passed directly to `BrandProfile.create()`. Mongoose `strict: true` (default) silently ignores unknown fields, but the pattern is fragile. If the schema ever gains `strict: false` or if someone adds a field to the schema that shouldn't be user-settable (e.g. `isAdmin`, `plan`), this becomes a real mass-assignment vulnerability.

Fix:
```ts
const { name, description, targetAudience, tone, platforms, exampleVideoUrls, avatarUrl } = body
const profile = await BrandProfile.create({ name, description, targetAudience, tone, platforms, exampleVideoUrls, avatarUrl })
```

---

**[I4] (confidence: 8/10) `src/app/api/v1/workflow/dalle/generate/route.ts:22` — OpenAI key forwarded to configurable LLM_BASE_URL**

```ts
const dalleRes = await fetch(`${LLM_BASE_URL}/images/generations`, {
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
})
```

`LLM_BASE_URL` defaults to OpenAI but is configurable. If a non-OpenAI `LLM_BASE_URL` is set (e.g. for the chat completion routes), the DALL-E route also switches and sends `OPENAI_API_KEY` to that endpoint. A misconfiguration leaks the OpenAI key to a third party.

DALL-E is an OpenAI-only service. This route should use a hardcoded OpenAI base URL or a separate `DALLE_BASE_URL` env var, not the shared `LLM_BASE_URL`.

---

**[I5] (confidence: 6/10) `src/app/api/v1/projects/suggest-title/route.ts:88` — LLM error details leaked to client**

```ts
const message = error instanceof Error ? error.message : 'Failed to suggest title'
return NextResponse.json({ error: message }, { status: 502 })
```

Internal OpenAI error messages (rate limits, model errors, timeout details) are returned verbatim to the client. This leaks implementation details.

---

### POSITIVE NOTES

These are done well and worth calling out:

- **sunoApiKeyOverride redacted at server boundary** — `page.tsx:31` nulls the key before passing to the client. The PATCH endpoint returns `{ok: true}` not the project document. No key leak to the browser.
- **409 race condition guard on approve** — `status === 'generating'` check before processing is solid.
- **ObjectId validation on all dynamic routes** — `mongoose.Types.ObjectId.isValid(id)` before DB queries prevents invalid-ID errors from surfacing as 500s.
- **Suno callback always returns 200** — correct behavior to prevent Suno retry loops.
- **StepState deduplicated** — R10a is fully done. `workflow-templates.ts` exports the canonical type, `CharacterStepPanel`, `KlingStepPanel`, `LLMStepPanel`, `MusicPromptStepPanel`, `SceneStepPanel` all import from it. Local copies gone.
- **EditableTextStepPanel** — R10b done. 615 lines of copy-paste → 120 lines. Clean.
- **GenerateSpinner + CopyButton in ui/** — done. LLMStepPanel re-exports CopyButton for backward compat.
- **LLM_BASE_URL** for chat completions — good for custom/proxy deployments.
- **sessionStorage step persistence** — nice UX addition. Error handling for private-mode browsers.
- **Step reopen cleanup** — steps 1-7 now clear `llmResponse` and `conversation` on reopen, not just status. Correct.

---

## Action Plan

### Must fix before shipping to production

| # | File | Fix |
|---|------|-----|
| C1 | `src/lib/auth.ts` | Fail closed when `API_SECRET` is not set |
| C2 | `workflow/dalle/generate/route.ts` | Add `{ auth: true }` |
| C3 | `workflow/cloudinary/upload-video/route.ts` | Add `{ auth: true }` |
| C4 | `workflow/cloudinary/upload-image-file/route.ts` | Migrate to `apiHandler(..., { auth: true })` |
| C5 | `assets/upload/route.ts` | Migrate to `apiHandler(..., { auth: true })` |
| C6 | `projects/suggest-title/route.ts` | Migrate to `apiHandler(..., { auth: true })` |
| C7 | `workflow/suno/start/route.ts` | Add `apiHandler(..., { auth: true })` |
| C8 | `workflow/suno/status/route.ts` | Add `apiHandler(..., { auth: true })` |

### Fix after / when time allows

| # | File | Fix |
|---|------|-----|
| I1 | `workflow/suno/callback/route.ts` | Add per-project callback token |
| I2 | `workflow/suno/callback/route.ts` | Use `findOneAndUpdate` for atomic write |
| I3 | `brand/route.ts` | Destructure known fields before `BrandProfile.create()` |
| I4 | `workflow/dalle/generate/route.ts` | Use separate `DALLE_BASE_URL` or hardcode OpenAI |
| I5 | `projects/suggest-title/route.ts` | Return generic 502 message for non-config errors |

---

## Adversarial Review (Red Team)

The red-team subagent independently confirmed all Critical findings above. Additionally flagged:

- `suggest-title` allows brand profile enumeration by ObjectId guessing (acceptable risk for a personal tool; not acceptable for multi-tenant)
- `upload-image-file` MIME check is client-controlled — magic-byte validation would be more reliable
- No ownership model on sunoApiKeyOverride — any authenticated session can write to any project's step 4 key (relevant only when multi-user auth is added)

---

## R10 Refactor Completion Status

| Chunk | Status | Notes |
|-------|--------|-------|
| R10a — StepState export | DONE | All 9 target files updated |
| R10a — CopyButton in ui/ | DONE | LLMStepPanel re-exports for compat |
| R10a — GenerateSpinner in ui/ | DONE | All 5 target files updated |
| R10b — EditableTextStepPanel | DONE | 3 old panels deleted |
| R10b — WorkflowClient updated | DONE | Steps 1/2/3 use new component |
| R10c — api-handler.ts created | DONE | Correct implementation |
| R10c — 11 routes migrated | PARTIAL | 3 new routes added but NOT migrated (C4, C5, C6) |

**R10c is 85% done.** The 3 new routes (`suggest-title`, `upload-image-file`, `assets/upload`) were written alongside the migration but use the old pattern. Completing the migration is straightforward — 30 min to fix all 3.
