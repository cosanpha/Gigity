# R12 — Source Cleanup & Refactor Overview
**Goal:** Reduce dirty code, duplication, file count, and line count without touching any feature, flow, or UI.  
**Safety constraint:** All features, functions, flows, and UI remain 100% identical. Zero behavior changes.  
**Estimated line reduction:** ~650 lines (~7% of 9,700 total)  
**Estimated file reduction:** -5 files  

---

## The Problem

The source is AI-generated and shows classic AI code smells:
- Near-identical functions copy-pasted instead of shared
- God component (WorkflowClient.tsx, 1093 lines) with redundant specialized helpers
- Small lib files that each do one tiny thing and could share a file
- A 249-line constants file where 70% of the data is never used
- `eslint-disable @typescript-eslint/no-explicit-any` in 5 files indicating unresolved type problems

The result is code that is hard to debug because a bug in "approve" might need to be fixed in 3 places, and code that is hard to navigate because there are too many small files to hold in your head.

---

## What Stays the Same

Everything the user sees and every API endpoint behavior. This is pure structural cleanup.

---

## Chunks (implement in order — each is independent after Chunk A)

| Chunk | File | Focus | Line delta | File delta |
|-------|------|-------|-----------|-----------|
| [A](R12a-api-consolidation.md) | R12a | Merge 3 regenerate API routes → 1 | -280 | -2 |
| [B](R12b-workflowclient-split.md) | R12b | Remove redundant approve/reopen wrappers in WorkflowClient | -85 | 0 |
| [C](R12c-lib-consolidation.md) | R12c | Merge tiny lib files (url utils, publish) | -30 | -3 |
| [D](R12d-ai-models-trim.md) | R12d | Trim ai-models.ts to only used models | -170 | 0 |
| [E](R12e-component-extraction.md) | R12e | Extract PublishStepSection & SunoMusicSection to own files | 0 | +2 (worth it) |

Chunks B, C, D, E can be done in any order after A. Chunk A is first because the regenerate routes share a utility that the refactored code also uses.

---

## Architecture Diagram (current vs target)

```
CURRENT: Too many tiny files, redundant functions
─────────────────────────────────────────────────
src/lib/
  is-http-url.ts          (20 lines)
  prompt-http-urls.ts     (35 lines)   ─── 3 files doing URL work
  video-url.ts            (35 lines)
  publish-links.ts        (52 lines)
  publish-copy.ts         (100 lines)  ─── 2 files for publish parsing

src/app/api/v1/projects/[id]/steps/[n]/
  regenerate-character-prompt/route.ts  (119 lines)
  regenerate-kling-prompt/route.ts      (129 lines)  ─── 90% identical
  regenerate-scene-prompt/route.ts      (147 lines)

src/components/WorkflowClient.tsx       (1093 lines)
  approveCharacterStep()   ─── nearly identical
  approveSceneStep()       ─── nearly identical
  approveKlingStep()       ─── nearly identical
  reopenCharacterStep()    ─── just calls reopen(5)
  reopenSceneStep()        ─── just calls reopen(6)

src/constants/ai-models.ts  (249 lines, but only 3 models used)

TARGET: Fewer files, less repetition
─────────────────────────────────────────────────
src/lib/
  url-utils.ts            (~70 lines, merges 3 files)
  publish.ts              (~140 lines, merges 2 files)

src/app/api/v1/projects/[id]/steps/[n]/
  regenerate-prompt/route.ts  (~120 lines, replaces 3 files)

src/components/WorkflowClient.tsx  (~1010 lines)
  approve(n, opts)  ─── one function handles all cases
  reopen(n)         ─── one function handles all cases

src/constants/ai-models.ts  (~80 lines, only models in use)
```

---

## What to Watch Out For

1. The 3 regenerate routes have slightly different prompts — the merged route must preserve each prompt exactly.
2. `publish-links.ts` exports `encodePublishLinks` / `decodePublishLinks`. `publish-copy.ts` exports `normalizePublishPlatforms`, `splitPublishMarkdownByHeading`, etc. All export names must stay the same in the merged file to avoid import changes.
3. WorkflowClient's `approveCharacterStep` hardcodes step 5 with a `setActiveStep(6)`. The generic `approve(n)` already does `setActiveStep(n+1)`. They are equivalent — verify before removing.
4. `ai-models.ts` is imported by `constants/workflow-llm-models.ts` and `components/StepLlmModelCaption.tsx`. Removing a model key will break `AI_MODELS[key]` lookups — only remove keys that are NOT referenced anywhere.
