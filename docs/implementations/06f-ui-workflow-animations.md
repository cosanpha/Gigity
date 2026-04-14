# 06f — UI Redesign: Workflow Page Animations

**Milestone:** UI Redesign Pass A  
**Depends on:** `06e` (framer-motion must be installed)  
**Scope:** Animate step panel transitions in WorkflowClient; animate sidebar step entrance in StepSidebar

---

## Context

Files to modify:
- `src/components/WorkflowClient.tsx` — the main workflow shell (already `'use client'`)
- `src/components/StepSidebar.tsx` — the left sidebar listing steps (needs `'use client'` added)

Design reference: `docs/designs/workflow.html`

Changes are purely visual. No state, no API, no prop changes.

---

## 1. `src/components/WorkflowClient.tsx` — MODIFY

### 1a. Add imports

Add at the top with other imports:
```tsx
import { AnimatePresence, motion } from 'framer-motion'
```

### 1b. Wrap the step panel area

Find the section that renders the active step panel. It looks like:
```tsx
<main className="relative min-h-0 flex-1 overflow-y-auto">
  {activeStep === 1 ? (
    <EditableTextStepPanel ...
```

Wrap the content inside `<main>` with `AnimatePresence` + `motion.div` keyed on `activeStep`:

```tsx
<main className="relative min-h-0 flex-1 overflow-y-auto">
  <AnimatePresence mode="sync" initial={false}>
    <motion.div
      key={activeStep}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.13, ease: 'easeOut' }}
      className="h-full"
    >
      {activeStep === 1 ? (
        <EditableTextStepPanel ... />
      ) : activeStep === 2 ? (
        ...
      ) : (
        ...
      )}
    </motion.div>
  </AnimatePresence>
</main>
```

Key notes:
- `mode="sync"` not `"wait"` — this lets the new step start entering while the old one exits. If `"wait"` is used, the exit animation blocks user interaction briefly, which feels laggy on the approve/generate buttons.
- `duration: 0.13` — fast, 130ms. Step switching should feel instant, not theatrical.
- `x: 10 → 0` on enter, `x: -10` on exit — subtle horizontal slide gives sense of direction without being distracting.
- `initial={false}` — skip animation on first render (step 1 is already visible when page loads).

---

## 2. `src/components/StepSidebar.tsx` — MODIFY

### 2a. Add `'use client'` directive

StepSidebar uses `motion` from framer-motion, which requires a client context.

Add at the very top of the file (line 1):
```tsx
'use client'
```

### 2b. Add import

```tsx
import { motion } from 'framer-motion'
```

### 2c. Replace `<button>` with `<motion.button>`

Find the step list mapping. The current `<button>` element:
```tsx
<button
  key={def.stepNumber}
  onClick={() => !isLocked && onSelect(def.stepNumber)}
  disabled={isLocked}
  className={`flex w-full cursor-pointer items-center gap-3 ...`}
>
```

Replace with:
```tsx
<motion.button
  key={def.stepNumber}
  initial={{ opacity: 0, x: -8 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.18, delay: i * 0.03, ease: 'easeOut' }}
  onClick={() => !isLocked && onSelect(def.stepNumber)}
  disabled={isLocked}
  className={`flex w-full cursor-pointer items-center gap-3 ...`}
>
```

> `i` is the loop index from `stepDefs.map((def, i) => ...)`. Make sure the map callback destructures the index.

The stagger `delay: i * 0.03` means step 1 enters at 0ms, step 2 at 30ms, step 3 at 60ms, etc. With 8 steps the last one enters at 210ms — fast enough to feel like a cascade, not a queue.

---

## Verification

```bash
bunx tsc --noEmit
```

Expected: zero errors.

Visual check:
1. Open any project workflow page
2. Click between steps — step panel should slide left/right with a 130ms transition
3. On initial page load, sidebar steps should stagger in from the left (8 steps, ~210ms total)
4. Approve or generate a step — the new panel should appear without blocking interaction during transition
