# R12e — Extract Large Inline Sub-Components
**Parent:** R12-refactor-overview.md  
**Impact:** 0 net lines, -2 god files, +2 focused files  
**Risk:** Very low — pure file splits, zero logic change, all imports stay identical from WorkflowClient's perspective

---

## Problem

Two component files are in the 900-1000 line range because they contain large inner components that are never used anywhere else:

```
src/components/ExternalStepPanel.tsx      (917 lines)
  AssetGroup                    line  63  — CapCut asset display helper
  DownloadAllButton             line 308  — CapCut zip download button
  PublishStepSection            line 429  — entire Publish step UI (editing)
  PublishStepDoneView           line 564  — entire Publish step UI (done state)
  ExternalStepPanel (export)    line 652  — main export

src/components/MusicPromptStepPanel.tsx   (997 lines)
  splitStoredAudioUrls          line  20  — pure Suno URL helper
  clampTrackIndex               line  29  — pure helper
  composeStep4Document          line  36  — pure helper
  extractSunoTaskIdFromStartBody line  52 — pure helper
  normalizeAndValidateAudioUrl  line  70  — pure helper
  SunoMusicSection              line 105  — entire Suno track generation UI
  MusicPromptStepPanel (export) line 732  — main export
```

`PublishStepSection` + `PublishStepDoneView` together are ~220 lines of JSX. `SunoMusicSection` is ~625 lines. Neither is reused outside its file. Extracting them makes each file readable in isolation.

---

## Split 1: Publish sub-components → `src/components/PublishStepSection.tsx`

**New file: `src/components/PublishStepSection.tsx`**

Move these items from `ExternalStepPanel.tsx`:
- The `decodePublishLinks` import (line 6 of ExternalStepPanel — only used by the publish functions)
- `PublishStepSection` function (lines 429–562)
- `PublishStepDoneView` function (lines 564–650)

The new file needs these imports:
```typescript
'use client'

import { PasteOnlyUrlInput } from '@/components/ui/PasteOnlyUrlInput'
import { decodePublishLinks } from '@/lib/publish-links'
import { useState, useEffect } from 'react'
import { CopyButton } from './ui/CopyButton'
```

Export both functions:
```typescript
export function PublishStepSection({ ... }) { ... }
export function PublishStepDoneView({ ... }) { ... }
```

**Update `ExternalStepPanel.tsx`:**
- Remove the moved functions and the `decodePublishLinks` import
- Add: `import { PublishStepSection, PublishStepDoneView } from './PublishStepSection'`
- Nothing else changes — these are already local function calls inside ExternalStepPanel's render

**Result:** ExternalStepPanel drops from 917 → ~700 lines. PublishStepSection.tsx is ~230 lines.

---

## Split 2: Suno sub-component → `src/components/SunoMusicSection.tsx`

**New file: `src/components/SunoMusicSection.tsx`**

Move these items from `MusicPromptStepPanel.tsx`:
- `SunoPersist` type (line 40)
- `SunoPollCtl` type (line 50)
- `splitStoredAudioUrls` function (line 20)
- `clampTrackIndex` function (line 29)
- `extractSunoTaskIdFromStartBody` function (line 52)
- `normalizeAndValidateAudioUrl` function (line 70)
- `SunoMusicSection` function (line 105)

The new file needs these imports:
```typescript
'use client'

import { PasteOnlyUrlInput } from '@/components/ui/PasteOnlyUrlInput'
import { apiFetch } from '@/lib/api-fetch'
import {
  everyAudioUrlLineIsFinal,
  normalizeSunoStoredUrl,
  pathnameEndsWithAudioFile,
} from '@/lib/suno-record-info'
import { StepState } from '@/lib/workflow-templates'
import { LucideArrowUpRight, LucideCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CopyButton } from './ui/CopyButton'
import { GenerateSpinner } from './ui/GenerateSpinner'
```

Export the main component and the types it exposes:
```typescript
export type { SunoPersist }
export function SunoMusicSection({ ... }) { ... }
```

Also export `splitStoredAudioUrls` — it is called from `MusicPromptStepPanel` at lines 789 and 791:
```typescript
const hasPreviewOrFinalAudioUrl = splitStoredAudioUrls(state.outputAssetUrl).length > 0
```

So `splitStoredAudioUrls` must be exported from the new file.

**Update `MusicPromptStepPanel.tsx`:**
- Remove all moved code
- Keep `composeStep4Document` (line 36) — it is called at line 767 inside `handleStyleEdit`, which stays in MusicPromptStepPanel
- Add:
  ```typescript
  import { SunoMusicSection, SunoPersist, splitStoredAudioUrls } from './SunoMusicSection'
  ```
- Nothing else changes — `SunoMusicSection` is already rendered as `<SunoMusicSection ... />` inside MusicPromptStepPanel's JSX

**Result:** MusicPromptStepPanel drops from 997 → ~270 lines. SunoMusicSection.tsx is ~730 lines.

---

## What NOT to move

**`composeStep4Document`** stays in `MusicPromptStepPanel.tsx`. It composes the LLM-stored document format (`**Lyrics**\n...\n**Style Prompt**\n...`) and is called inline in `handleStyleEdit`. It only has 3 lines and has no Suno dependency.

**`AssetGroup` and `DownloadAllButton`** stay in `ExternalStepPanel.tsx`. They are CapCut-specific helpers used only inside ExternalStepPanel's render (the CapCut step view). At 370 lines combined with ExternalStepPanel, the file will be a readable size after the publish split.

---

## File size after extraction

| File | Before | After |
|------|--------|-------|
| ExternalStepPanel.tsx | 917 | ~700 |
| PublishStepSection.tsx | (new) | ~230 |
| MusicPromptStepPanel.tsx | 997 | ~270 |
| SunoMusicSection.tsx | (new) | ~730 |

The net line count is zero (minus a few blank lines). The gain is navigability.

---

## Implementation Order

Do Split 1 first (simpler: no type re-exports). Then Split 2.

For each split:
1. Create the new file
2. Remove moved code from the original file
3. Add the import line in the original file
4. Run `bun run build` — it should pass immediately since all exports are identical

---

## Verification Checklist

- [ ] `bun run build` passes with no missing module errors after each split
- [ ] TypeScript reports no errors in ExternalStepPanel.tsx, PublishStepSection.tsx
- [ ] TypeScript reports no errors in MusicPromptStepPanel.tsx, SunoMusicSection.tsx
- [ ] Publish step (step 9) — generate description button works, platform copy fields work, publish links save on paste
- [ ] CapCut step (step 8) — asset list renders, download-all zip works
- [ ] Music step (step 4) — Suno generate button works, track selection works, manual URL entry works
- [ ] No visual difference in any step panel
