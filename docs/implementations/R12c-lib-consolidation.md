# R12c — Merge Tiny Lib Files
**Parent:** R12-refactor-overview.md  
**Impact:** -3 files (5 files → 2), minimal line reduction, major navigability improvement  
**Risk:** Very low — pure renames/moves, no logic change  

---

## Problem

The `src/lib/` directory has several files that each do one small thing and are always imported together or are conceptually the same domain:

```
src/lib/is-http-url.ts        (20 lines) — isHttpOrHttpsUrl, pastedTextHasOnlyHttpUrls
src/lib/prompt-http-urls.ts   (35 lines) — sanitizeHttpUrlFromChunk, extractHttpUrlsFromPromptText
src/lib/video-url.ts          (35 lines) — isProbablyVideoHttpUrl

src/lib/publish-links.ts      (52 lines) — encodePublishLinks, decodePublishLinks
src/lib/publish-copy.ts       (100 lines) — normalizePublishPlatforms, split/join/merge helpers
```

These 5 files all live in the same mental domain ("URL utilities" and "publish content utilities"). Having them split makes grepping and debugging harder than it needs to be.

---

## Merge 1: URL utilities → `src/lib/url-utils.ts`

Merge `is-http-url.ts`, `prompt-http-urls.ts`, and `video-url.ts` into one file.

**New file `src/lib/url-utils.ts`:**

```typescript
// ─── HTTP URL validation ───────────────────────────────────────────────────

export function isHttpOrHttpsUrl(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (!u.hostname) return false
    return true
  } catch {
    return false
  }
}

export function pastedTextHasOnlyHttpUrls(text: string): boolean {
  const lines = text.split(/\n/)
  for (const line of lines) {
    const t = line.trim()
    if (t === '') continue
    if (!isHttpOrHttpsUrl(t)) return false
  }
  return true
}

// ─── URL extraction from prompt text ──────────────────────────────────────

export function sanitizeHttpUrlFromChunk(raw: string): string | null {
  let t = raw.trim()
  while (t.length > 0) {
    const last = t[t.length - 1]
    if (last === ')' || last === ']' || last === '}' || last === '"' || last === "'" || last === '>' || last === ',') {
      t = t.slice(0, -1)
      continue
    }
    break
  }
  if (!t) return null
  try {
    const u = new URL(t)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.href
  } catch {
    return null
  }
}

export function extractHttpUrlsFromPromptText(text: string): string[] {
  const chunks = text.match(/https?:\/\/\S+/g) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const chunk of chunks) {
    const href = sanitizeHttpUrlFromChunk(chunk)
    if (href && !seen.has(href)) {
      seen.add(href)
      out.push(href)
    }
  }
  return out
}

// ─── Video URL detection ──────────────────────────────────────────────────

/** Client-side check: URL looks like a video resource (file extension or Cloudinary video delivery). */
export function isProbablyVideoHttpUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (u.hostname === 'res.cloudinary.com' && (u.pathname.includes('/video/upload/') || u.pathname.includes('/video/fetch/'))) {
      return true
    }
    const pathAndQuery = `${u.pathname}${u.search}`.toLowerCase()
    if (/\.(mp4|webm|mov|m4v|mkv|mpeg|mpg|ogv)(\?|#|&|$)/i.test(pathAndQuery)) return true
    if (/[?&]format=(mp4|webm|mov|m4v)(\?|&|$)/i.test(u.search) || /[?&]type=video/i.test(u.search)) return true
    return false
  } catch {
    return false
  }
}
```

**Update all import sites:**

| Old import | New import |
|-----------|-----------|
| `from '@/lib/is-http-url'` | `from '@/lib/url-utils'` |
| `from '@/lib/prompt-http-urls'` | `from '@/lib/url-utils'` |
| `from '@/lib/video-url'` | `from '@/lib/url-utils'` |

Files that import these (run a search to confirm):
- `src/lib/cloudinary-client.ts` — imports `extractHttpUrlsFromPromptText`
- `src/components/BrandForm.tsx` — imports `isHttpOrHttpsUrl`
- `src/components/CharacterStepPanel.tsx` — imports `isHttpOrHttpsUrl`
- `src/components/KlingStepPanel.tsx` — imports `isProbablyVideoHttpUrl`
- `src/components/ui/PasteOnlyUrlInput.tsx` — imports `isHttpOrHttpsUrl` or `pastedTextHasOnlyHttpUrls`
- `src/components/ui/PasteOnlyUrlTextarea.tsx` — same
- `src/app/api/v1/projects/[id]/steps/[n]/regenerate-scene-prompt/route.ts` — will be deleted in R12a

**Delete old files:**
- `src/lib/is-http-url.ts`
- `src/lib/prompt-http-urls.ts`
- `src/lib/video-url.ts`

---

## Merge 2: Publish utilities → `src/lib/publish.ts`

Merge `publish-links.ts` and `publish-copy.ts` into one file.

**New file `src/lib/publish.ts`:**

Simply concatenate both files (they have no naming conflicts). Add a section comment between them:

```typescript
// ─── Publish links (per-platform URL storage) ─────────────────────────────
// ... contents of publish-links.ts ...

// ─── Publish copy (LLM output parsing) ────────────────────────────────────
// ... contents of publish-copy.ts ...
```

All export names stay identical — no import path changes needed beyond updating `'@/lib/publish-links'` → `'@/lib/publish'` and `'@/lib/publish-copy'` → `'@/lib/publish'`.

**Files that import these:**
- `src/components/WorkflowClient.tsx` — imports from publish-copy
- `src/components/ExternalStepPanel.tsx` — imports from publish-links + publish-copy
- `src/app/api/v1/projects/[id]/steps/9/generate-publish-description/route.ts` — imports publish-copy
- `src/app/api/v1/projects/[id]/steps/9/generate-publish-description/publish-prompt.ts` — imports publish-copy

**Delete old files:**
- `src/lib/publish-links.ts`
- `src/lib/publish-copy.ts`

---

## Verification Checklist

- [ ] `bun run build` passes with no missing module errors
- [ ] All URL validation still works (paste-only inputs reject non-http URLs)
- [ ] Publish step copy generation still works
- [ ] Per-platform publish links encode/decode correctly
- [ ] TypeScript reports no errors on the merged files
