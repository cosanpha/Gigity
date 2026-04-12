# R10 — Code Optimization: Unify, DRY, and Commonalize

**Goal:** Reduce code duplication, eliminate hard-coded values, and enforce one unified
coding structure across all components and routes — without changing any UI or behavior.

**Constraint:** Zero visible changes to the user. Every screen must look and function
exactly as it does today after every chunk.

**Reference:** Audit performed on `main` branch, April 2026.

---

## What this refactor fixes

| Problem | Instances | Fix |
|---------|-----------|-----|
| `StepState` type redefined locally | 10 files | Export from one shared location |
| `CopyButton` component defined locally | 3 files (+ 1 exported) | One `ui/CopyButton.tsx` |
| `CampaignBriefStepPanel`, `StoryStepPanel`, `SongLyricsStepPanel` — near-identical | ~600 lines of copy-paste | One `EditableTextStepPanel` |
| `GenerateSpinner` SVG duplicated | 5+ files | One `ui/GenerateSpinner.tsx` |
| API routes: `try/catch` + 500 boilerplate duplicated | 41 occurrences | One `apiHandler` wrapper |
| Hard-coded step numbers in panels | Several | Derive from `StepDefinition` |

---

## Chunks — run each in a separate Cursor session

| File | Scope | Risk |
|------|-------|------|
| [R10a — Shared primitives](R10a-shared-primitives.md) | Types + tiny UI components | Low |
| [R10b — Collapse text step panels](R10b-text-step-panels.md) | Merge 3 duplicate panels into 1 | Medium |
| [R10c — API handler wrapper](R10c-api-handler.md) | Wrap all route handlers | Medium |

**Recommended order:** R10a first (others depend on its shared types), then R10b and R10c in either order.

---

## NOT in scope

- Changing any UI appearance
- Changing any data fetching logic
- Refactoring `CharacterStepPanel` or `SceneStepPanel` — they share some patterns but have very different internals (custom image upload flows, aligned slot logic, prompt replacement). The risk-to-reward ratio is poor.
- Refactoring `MusicPromptStepPanel` or `KlingStepPanel` — too domain-specific to safely generalize.
- Merging `ExternalStepPanel` into a generic — it handles steps 8 and 9 with CapCut zip download and publish link saving; unique enough to stay standalone.
- Moving prompt templates out of `workflow-templates.ts` into a separate file — not necessary.

---

## What already exists (don't rebuild)

- `src/constants/env.server.ts`, `env.client.ts`, `common.ts`, `suno.ts` — already extracted. Add to these, don't create new constant files unless the category is clearly distinct.
- `src/lib/workflow-templates.ts` exports `WORKFLOW_STEPS`, `WORKFLOW_TOTAL_STEPS`, `StepDefinition`, `StepType` — use these everywhere.
- `CopyButton` is already exported from `LLMStepPanel.tsx` — `CharacterStepPanel` already imports it from there. The problem is `KlingStepPanel` and `CampaignBriefStepPanel`/`StoryStepPanel`/`SongLyricsStepPanel` define their own locals.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET
