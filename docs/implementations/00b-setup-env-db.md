# 00b — Setup: Env Constants & DB Connection

## What this builds

Two typed constant files (`env.server.ts` with a server-only guard, `env.client.ts`
for public vars) and a Mongoose singleton connection (`db.ts`). Also updates `.env.example`
and removes the old `environments.ts`.

## Prerequisites

[00a-setup-deps.md](00a-setup-deps.md) — `mongoose` and `server-only` must be installed.

## Files to create/modify

```
src/constants/env.server.ts   ← CREATE — server-only env vars (with guard)
src/constants/env.client.ts   ← CREATE — NEXT_PUBLIC_* vars only
src/constants/environments.ts ← DELETE — replaced by the two files above
src/lib/db.ts                 ← CREATE — Mongoose singleton connection
.env.example                  ← already correct, verify MONGODB key is present
```

---

## Step 1 — Create `src/constants/env.server.ts`

```ts
import 'server-only'

export const MONGODB = process.env.MONGODB
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1'
export const LLM_MODEL = process.env.LLM_MODEL ?? 'gpt-4.1-mini'
```

The `import 'server-only'` line causes a **build error** if this file is ever imported
from a client component. That's the guard — it prevents API keys from leaking to the browser.

---

## Step 2 — Create `src/constants/env.client.ts`

```ts
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
export const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? '/api/v1'
export const VERSION = process.env.NEXT_PUBLIC_VERSION ?? '1.0.0'
```

Only `NEXT_PUBLIC_*` vars here — safe to import anywhere.

---

## Step 3 — Delete `src/constants/environments.ts`

It exposed server secrets without a guard. The two new files above replace it.

```bash
rm src/constants/environments.ts
```

Check for any imports of `environments` across the codebase and remove them:

```bash
grep -r "environments" src/
```

If nothing imports it (expected — the app is mostly empty), proceed.

---

## Step 4 — Create `src/lib/db.ts`

Mongoose needs a singleton connection. Next.js hot-reloads create new module
instances in dev, which would open 50+ parallel connections without this pattern.

```ts
import mongoose from 'mongoose'
import { MONGODB } from '@/constants/env.server'

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | undefined
}

export async function connectDB() {
  if (global._mongooseConn) return global._mongooseConn
  if (!MONGODB) throw new Error('MONGODB env var is not set')
  global._mongooseConn = await mongoose.connect(MONGODB)
  return global._mongooseConn
}
```

Call `await connectDB()` at the top of every API route handler that touches the DB.

---

## Step 5 — Verify `.env.example` has all required keys

```bash
# .env.example should have:
MONGODB=<your_mongodb_connection_string>
OPENAI_API_KEY=<your_openai_api_key>
# Optional:
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_MODEL=gpt-4.1-mini
```

Your `.env` (local, gitignored) should have real values. Check with:

```bash
cat .env
```

---

## Verify

```bash
bun dev
```

- No build error referencing `environments.ts`
- Importing `env.server.ts` from a client component throws a build error (good — it's working)
- DB connection is lazy — it connects on first API call, not at startup

---

**Output:** Typed env constants with server-only protection. Mongoose singleton ready.

**Next step:** [00c-design-tokens.md](00c-design-tokens.md) — design tokens and globals.css

