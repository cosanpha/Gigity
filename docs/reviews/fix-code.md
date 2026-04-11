# fix-code — Reusable Fix Plan

## How to use this file

Reference this file alongside `review-all.md` when you want to fix bugs.

Example prompt in a new Cursor chat:

```
@docs/reviews/fix-code.md
@docs/reviews/review-all.md
Please fix all
```

Or to fix specific items:

```
@docs/reviews/fix-code.md
@docs/reviews/review-all.md
Fix BUG-001, BUG-002, BUG-004
```

---

## Project context

- **Stack:** Next.js 16.1.1 / React 19 / Tailwind CSS 4 / MongoDB + Mongoose / Bun
- **Params are a Promise:** Always `await params` before accessing `.id`, `.n`, etc.
- **Mongoose guard:** `mongoose.models.X ?? mongoose.model('X', schema)` — always
- **No `process.env` directly** in routes — import from `@/constants/env.server`
- **Named exports only** — no default exports for components
- **No `try/catch`** unless the bug explicitly requires it
- **No extra features** — fix only what is listed, nothing else
- **Tailwind only** — no inline styles, no CSS class names from design files

---

## Fix protocol

For each bug in the review file:

### Step 1 — Read the file before editing

Always read the full file before making any change. Never edit blindly.

### Step 2 — Make the minimal fix

Fix only the stated problem. Do not refactor surrounding code, add comments, or
change anything unrelated to the bug. One logical change per bug.

### Step 3 — Verify the fix is consistent

After each fix, check:

- TypeScript types are consistent (no new `any` introduced)
- The fix matches the conventions in `.cursor/rules/gigity.mdc`
- No `console.log` statements added
- No new dependencies added

### Step 4 — Update review-all.md

After fixing a bug, move its entry from the active section to the `## Fixed` section
at the bottom of `review-all.md`. Format:

```markdown
## Fixed

| ID      | Issue                          | Fixed in    |
| ------- | ------------------------------ | ----------- |
| BUG-001 | Dashboard never loads projects | [file:line] |
```

If no `## Fixed` section exists, create it at the bottom of the file.

---

## Fix reference — current bugs

Read `review-all.md` for the full list. Quick index:

| ID      | File                                                                     | What to fix                                                                                           |
| ------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| BUG-001 | `src/app/page.tsx:16`                                                    | Replace `const projects: any[] = []` with a real `VideoProject.find(...)` query                       |
| BUG-002 | `src/lib/llm.ts:98`                                                      | Guard `data.choices[0]` — add optional chaining and throw if empty                                    |
| BUG-003 | `src/components/ExternalStepPanel.tsx` + `src/lib/workflow-templates.ts` | Interpolate `stepDef.instruction` before rendering, or remove `{{platform}}` from step 11 template    |
| BUG-004 | `src/app/api/v1/brand/[id]/route.ts:56-72`                               | Uncomment the VideoProject existence check in DELETE handler                                          |
| BUG-005 | `src/app/page.tsx:1`                                                     | Fix import path: `@/components/` → `@/components/NewVideoModal` (or create `src/components/index.ts`) |
| MED-001 | `src/components/WorkflowClient.tsx:23`                                   | Destructure `brand` from props — needed for BUG-003 fix                                               |
| MED-002 | `src/app/brand/[id]/edit/page.tsx:15-19`                                 | Add `.catch()` to the brand fetch useEffect                                                           |
| MED-003 | `src/app/api/v1/brand/route.ts` + `[id]/route.ts`                        | Remove duplicated `validateUrls` — extract to one place                                               |
| MED-004 | `src/app/api/(system)/version/route.ts:6`                                | Delete the `console.info('- Version -')` line                                                         |
| MIN-001 | `src/app/page.tsx` + `src/components/VideoCard.tsx`                      | Remove duplicated `formatRelativeDate` — keep one copy                                                |
| MIN-002 | `src/app/globals.css`                                                    | Remove `.dark {}` block and `trans-200/300/500` classes                                               |

---

## Fix order

Fix bugs in this order — earlier fixes unblock later ones:

1. **BUG-005** first — the broken import affects the dashboard page
2. **BUG-001** second — needs the import fixed first
3. **MED-001** third — `brand` prop needed for the BUG-003 fix
4. **BUG-003** fourth — depends on MED-001
5. **BUG-002**, **BUG-004**, **MED-002**, **MED-003**, **MED-004** — independent, any order
6. **MIN-001**, **MIN-002** — cleanup, do last

---

## After all fixes

Run the dev server to verify no build errors:

```bash
bun dev
```

Check:

1. `http://localhost:3000` loads (redirects to brand setup if no brand)
2. After creating a brand, dashboard loads
3. After creating a project, workflow view opens
4. `curl http://localhost:3000/api/system/health` returns `{"message":"✅ Good"}`

