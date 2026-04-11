# 00a — Setup: Dependencies & Quick Fixes

## What this builds

Install the two missing packages (`mongoose`, `server-only`), fix the broken health
route, and remove dead V2 code from the scaffold. The app should run cleanly after this.

## Prerequisites

None. This is the first step.

## Files to modify

```
package.json                          ← add mongoose + server-only (via bun add)
src/app/api/(system)/health/route.ts  ← fix POST→GET, add missing return
src/constants/common.ts               ← remove TOKEN key (auth is V2)
```

---

## Step 1 — Install packages

```bash
bun add mongoose server-only
```

After install, confirm both appear in `package.json` under `dependencies`.

---

## Step 2 — Fix the health route

Current bug: `POST` instead of `GET`, and `NextResponse.json()` is missing `return`
so the route returns `undefined`. (TODOS.md T-006)

Replace the entire file:

```ts
// src/app/api/(system)/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: '✅ Good' }, { status: 200 })
}
```

---

## Step 3 — Clean up dead scaffold code

`LOCAL_STORAGE_KEYS.TOKEN` in `common.ts` is leftover auth scaffolding. Auth is V2.
Remove it:

```ts
// src/constants/common.ts
export const ROUTES = {
  HOME: '/',
}
```

---

## Verify

```bash
bun dev
```

- No build errors on startup
- `curl http://localhost:3000/api/system/health` → `{"message":"✅ Good"}`
- `mongoose` and `server-only` visible in `package.json` dependencies

---

**Output:** Project runs cleanly. Packages are installed. Health route works.

**Next step:** [00b-setup-env-db.md](00b-setup-env-db.md) — env constants and DB connection

