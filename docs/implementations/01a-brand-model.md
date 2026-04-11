# 01a — Brand Profile: Mongoose Model

## What this builds

The `BrandProfile` Mongoose model with TypeScript interface. This is the only
Mongoose model for M1. No characters array — characters are per-video (V2 scope).

## Prerequisites

[00b-setup-env-db.md](00b-setup-env-db.md) — `mongoose` installed, `db.ts` exists.

## Files to create

```
src/models/BrandProfile.ts
```

---

## `src/models/BrandProfile.ts`

```ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBrandProfile extends Document {
  name: string
  description: string
  targetAudience: string
  tone: string           // comma-separated selected tones, e.g. "Warm, Modern"
  platforms: string[]    // e.g. ["TikTok", "YouTube Shorts"]
  exampleVideoUrls: string[]
  logoUrl: string
  userId: null           // always null in V1; V2 will set this to authenticated user's _id
  createdAt: Date
  updatedAt: Date
}

const BrandProfileSchema = new Schema<IBrandProfile>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    targetAudience: { type: String, default: '' },
    tone: { type: String, default: '' },
    platforms: { type: [String], default: [] },
    exampleVideoUrls: { type: [String], default: [] },
    logoUrl: { type: String, default: '' },
    userId: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

// Prevent model re-registration during Next.js hot-reload
const BrandProfile: Model<IBrandProfile> =
  mongoose.models.BrandProfile ??
  mongoose.model<IBrandProfile>('BrandProfile', BrandProfileSchema)

export default BrandProfile
```

### Key decisions

- No `characters[]` field. Characters emerge from the story script (Step 2 output).
- `userId: null` placeholder is intentional — makes V2 auth migration a one-liner.
- `tone` is stored as a comma-separated string (e.g. `"Warm, Modern, Bold"`), not an
  array. Simpler to display and edit.
- `timestamps: true` adds `createdAt` and `updatedAt` automatically.

---

## Verify

No direct test here — the model is tested implicitly through the API routes.
Check for TypeScript errors:

```bash
bun tsc --noEmit
```

Should compile cleanly.

---

**Output:** `BrandProfile` model + `IBrandProfile` interface, ready to use in API routes.

**Next step:** [01b-brand-api.md](01b-brand-api.md) — Brand API routes
