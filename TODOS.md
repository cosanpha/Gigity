# TODOS

## UI Redesign

### E2E test for step approval flow
**What:** Set up a Playwright (or Cypress) E2E test that walks through Step 1 → Step 2 on a project, including the approve action, to verify framer-motion animations don't block interactive elements.
**Why:** AnimatePresence mode="wait" can block button clicks during exit animations. Without a test, this regression is invisible until someone notices the approve button not responding mid-animation.
**Pros:** Catches the most dangerous animation regression automatically. Baseline for future E2E coverage.
**Cons:** Requires test setup overhead (Playwright install, test project fixture, CI integration). No test framework currently exists.
**Context:** Added after /plan-eng-review flagged `AnimatePresence mode="wait"` as a critical gap. WorkflowClient wraps step panels in AnimatePresence. If exit duration exceeds ~150ms with mode="wait", the next panel doesn't mount until exit completes — leaving the user unable to click anything.
**Depends on:** framer-motion animation wiring (Pass B) complete.

### Standardize cn() usage across top-level components
**What:** Update Navbar, BrandForm, VideoCard, DashboardProjectList, and other top-level components to import `cn()` from `@/lib/utils` instead of importing `clsx` directly.
**Why:** Currently only `src/components/ui/*` components use `cn()`. Top-level components bypass it and import clsx directly. Creates inconsistency and misses the tailwind-merge deduplication.
**Pros:** Consistent pattern across codebase. Prevents accidental class conflicts from tailwind-merge.
**Cons:** Mechanical change — low risk but adds noise to diffs.
**Context:** `cn()` already exists in `src/lib/utils.ts`. `tailwind-merge` is already a dependency. This is a find-replace-per-file change.
**Depends on:** None. Can be done independently of animation work.
