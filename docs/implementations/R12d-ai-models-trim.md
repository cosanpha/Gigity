# R12d — Trim ai-models.ts to Only Used Models
**Parent:** R12-refactor-overview.md  
**Impact:** -170 lines  
**Risk:** Very low — removing dead data, not logic  

---

## Problem

`src/constants/ai-models.ts` is 249 lines. It defines pricing data for ~20 GPT model variants. But `src/constants/workflow-llm-models.ts` only references these keys:

```typescript
const WORKFLOW_GENERATE_STEP_MODEL: Record<number, ModelKey> = {
  1: 'gpt-4.1',
  2: 'gpt-4.1',
  3: 'gpt-4.1-mini',
  4: 'gpt-4.1-mini',
  5: 'gpt-4.1-mini',
  6: 'gpt-4.1-mini',
  7: 'gpt-4.1-mini',
}
// + llmModelSuggestTitle() → 'gpt-4.1-mini'
// + llmModelPublishDescription() → 'gpt-4.1'
```

Only **2 model keys are ever used**: `'gpt-4.1'` and `'gpt-4.1-mini'`.

The `AIModelTokenPricing` type is also defined here but the pricing fields (`inputUsdPer1M`, etc.) are never read anywhere in the codebase (no cost calculation feature exists).

---

## What to Check First

Before trimming, verify nothing else uses the other model keys:

```bash
grep -r "AI_MODELS\[" src/ --include="*.ts" --include="*.tsx"
grep -r "gpt-5\|gpt-4\.5\|gpt-4\.0\|o1\|o3\|o4" src/ --include="*.ts" --include="*.tsx"
```

If only `workflow-llm-models.ts` uses `AI_MODELS[key]`, the trim is safe.

Also check `StepLlmModelCaption.tsx` — it calls `workflowStepLlmModelLabel()` which returns a model name string, but it doesn't import AI_MODELS directly.

---

## Solution

**Replace `src/constants/ai-models.ts` with the trimmed version:**

```typescript
export type AIModelTokenPricing = {
  name: string
  inputUsdPer1M: number
  cachedInputUsdPer1M: number | null
  outputUsdPer1M: number
}

/** Only models actively used in the workflow. Add entries here when switching models. */
export const AI_MODELS: Record<string, AIModelTokenPricing> = {
  'gpt-4.1': {
    name: 'gpt-4.1',
    inputUsdPer1M: 2.0,
    cachedInputUsdPer1M: 0.5,
    outputUsdPer1M: 8.0,
  },
  'gpt-4.1-mini': {
    name: 'gpt-4.1-mini',
    inputUsdPer1M: 0.4,
    cachedInputUsdPer1M: 0.1,
    outputUsdPer1M: 1.6,
  },
}
```

That's 22 lines vs 249. The `AIModelTokenPricing` type is kept because it's the return type used by `workflow-llm-models.ts`.

**Note:** Verify the pricing numbers against current OpenAI pricing before committing — the existing values in the file may be stale anyway.

---

## If You Need More Models Later

Add a new entry to `AI_MODELS` and a new key to `WORKFLOW_GENERATE_STEP_MODEL`. The type system (`ModelKey = keyof typeof AI_MODELS`) will automatically include it.

---

## Verification Checklist

- [ ] `bun run build` with no TypeScript errors
- [ ] `workflow-llm-models.ts` still compiles — `AI_MODELS['gpt-4.1']` and `AI_MODELS['gpt-4.1-mini']` resolve correctly
- [ ] `StepLlmModelCaption` still shows the correct model name in the UI
- [ ] No other file imports a model key that was removed
