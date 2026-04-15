# R12b — WorkflowClient: Remove Redundant Approve/Reopen Wrappers
**Parent:** R12-refactor-overview.md  
**Impact:** -85 lines in WorkflowClient.tsx  
**Risk:** Very low — these wrapper functions are provably equivalent to the generic versions  

---

## Problem

WorkflowClient.tsx has 5 specialized functions that are 100% redundant given the existing generic `approve(n, opts)` and `reopen(n)`:

```typescript
// These 5 functions exist:
async function approveCharacterStep(imageUrls: string)  // → just approve(5, { outputAssetUrl: imageUrls })
async function approveSceneStep(imageUrls: string)      // → just approve(6, { outputAssetUrl: imageUrls })
async function approveKlingStep(videoUrls: string)      // → just approve(7, { outputAssetUrl: videoUrls })
async function reopenCharacterStep()                    // → just reopen(5)
async function reopenSceneStep()                        // → just reopen(6)
```

The generic `approve(n, opts)` already:
- POSTs to the correct endpoint
- Handles errors (no, wait — actually `approveCharacterStep` sets `approveError` and `approve` does not. See below.)

**Catch:** `approveCharacterStep` and `approveSceneStep` call `setApproveError(null)` at the start and `setApproveError(err.error)` on failure. The generic `approve(n, opts)` does NOT set `approveError`. So the generic function needs one small upgrade before the wrappers can be removed.

---

## Solution

**Step 1: Upgrade `approve(n, opts)` to handle errors**

Current (line ~557):
```typescript
async function approve(n: number, opts: { outputAssetUrl?: string } = {}) {
  const res = await apiFetch(
    `/api/v1/projects/${project._id}/steps/${n}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    }
  )

  if (res.ok) {
    const url = opts.outputAssetUrl?.trim()
    setSteps(prev =>
      patch(prev, n, {
        status: 'done',
        ...(url ? { outputAssetUrl: url } : {}),
      })
    )
    if (n < WORKFLOW_TOTAL_STEPS) setActiveStep(n + 1)
  }
}
```

Replace with:
```typescript
async function approve(n: number, opts: { outputAssetUrl?: string } = {}) {
  setApproveError(null)
  const res = await apiFetch(
    `/api/v1/projects/${project._id}/steps/${n}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Approve failed' }))
    setApproveError(err.error ?? 'Approve failed')
    return
  }

  const url = opts.outputAssetUrl?.trim()
  setSteps(prev =>
    patch(prev, n, {
      status: 'done',
      ...(url ? { outputAssetUrl: url } : {}),
    })
  )
  if (n < WORKFLOW_TOTAL_STEPS) setActiveStep(n + 1)
}
```

**Step 2: Delete the 5 redundant functions**

Delete these functions entirely (they are all between lines ~467–555):
- `approveCharacterStep`
- `reopenCharacterStep`
- `approveSceneStep`
- `approveKlingStep`
- `reopenSceneStep`

**Step 3: Update all call sites**

Search for all calls to the removed functions and replace:

| Old call | New call |
|----------|----------|
| `approveCharacterStep(imageUrls)` | `approve(5, { outputAssetUrl: imageUrls })` |
| `reopenCharacterStep()` | `reopen(5)` |
| `approveSceneStep(imageUrls)` | `approve(6, { outputAssetUrl: imageUrls })` |
| `approveKlingStep(videoUrls)` | `approve(7, { outputAssetUrl: videoUrls })` |
| `reopenSceneStep()` | `reopen(6)` |

The call sites are in the JSX render section of WorkflowClient (~lines 600–1090), passed as props to CharacterStepPanel, SceneStepPanel, and KlingStepPanel.

Search pattern: `approveCharacterStep|reopenCharacterStep|approveSceneStep|approveKlingStep|reopenSceneStep`

---

## Verification Checklist

- [ ] Approving step 5 (character) works — moves to step 6, no error if no `approveError` state
- [ ] Approving step 6 (scene) works — moves to step 7
- [ ] Approving step 7 (Kling) works — moves to step 8
- [ ] Error from approve endpoint shows `approveError` in UI for all three steps
- [ ] Reopen step 5 works — moves back to step 5 panel
- [ ] Reopen step 6 works — moves back to step 6 panel
- [ ] Generic approve for steps 1-4, 8, 9 still works (no regression from adding setApproveError)

---

## Secondary Cleanup (optional, same PR)

While in WorkflowClient, also consider:

**Remove `// eslint-disable @typescript-eslint/no-explicit-any`** at the top. The `any` types mostly come from `project.steps as any[]` being passed to brand/step helpers. These can be typed with `IWorkflowStep` — the import is already present in adjacent files. This is a separate cleanup but low-risk.

**Extract `collectAssets()` and `parseUrls()` to `src/lib/workflow-assets.ts`** — they are pure functions with no React dependency. Moving them out reduces WorkflowClient's cognitive load. (~15 lines)

**Note:** Do NOT extract the API call functions (`generate`, `approve`, `reopen`, `saveProgress`) to a custom hook yet. That would require threading refs/state setters and adds complexity for marginal gain. The line reduction from removing the 5 redundant wrappers is enough.
