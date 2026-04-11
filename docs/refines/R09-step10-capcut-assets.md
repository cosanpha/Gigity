# R09 — Step 10: CapCut Asset Panel + Download All

## What this builds

Step 10 (Assemble in CapCut) currently shows a plain instruction. Users need to see all
project assets — character images, scene images, video clips, and the music track — in
one place so they can download everything before opening CapCut.

1. **Asset panel** — shows all assets grouped by type (characters, scenes, clips, music)
2. **Download button per asset** — opens the Cloudinary/storage URL
3. **Download all** — generates a text file of all URLs so the user can bulk-download
4. **Asset count summary** — "12 scene images, 12 clips, 1 music track"

## Files to change

```
src/components/ExternalStepPanel.tsx    ← add asset panel for step 10
src/components/WorkflowClient.tsx       ← collect and pass all asset URLs to step 10
```

No new API routes needed — all assets are already stored in `steps[N].outputAssetUrl`.

---

## Step 1 — Asset collection in WorkflowClient

Collect all URLs from completed steps:

```ts
// src/components/WorkflowClient.tsx — add helper
function collectAssets(steps: StepState[]): ProjectAssets {
  // step index is stepNumber - 1
  const characterImages = parseUrls(steps[5]?.outputAssetUrl)   // step 6
  const sceneImages     = parseUrls(steps[6]?.outputAssetUrl)   // step 7 (if stored)
  const videoClips      = parseUrls(steps[8]?.outputAssetUrl)   // step 9
  const musicTrack      = parseUrls(steps[3]?.outputAssetUrl)   // step 4 (SunoAI audio)

  return { characterImages, sceneImages, videoClips, musicTrack }
}

function parseUrls(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw.split('\n').map(u => u.trim()).filter(Boolean)
}

interface ProjectAssets {
  characterImages: string[]
  sceneImages: string[]
  videoClips: string[]
  musicTrack: string[]
}
```

Pass to `ExternalStepPanel` when step 10 is active:

```tsx
<ExternalStepPanel
  ...
  projectAssets={activeStep === 10 ? collectAssets(steps) : undefined}
/>
```

---

## Step 2 — ExternalStepPanel: asset panel UI

Add to `ExternalStepPanelProps`:

```ts
projectAssets?: {
  characterImages: string[]
  sceneImages: string[]
  videoClips: string[]
  musicTrack: string[]
}
```

Render the asset panel above the instruction text when `projectAssets` is provided:

```tsx
{projectAssets && (
  <div className="mb-6">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-[13px] font-medium text-zinc-700">Project assets</h3>
      <DownloadAllButton assets={projectAssets} />
    </div>

    <div className="flex flex-col gap-4">
      <AssetGroup
        title="Character images"
        urls={projectAssets.characterImages}
        icon="🧑"
      />
      <AssetGroup
        title="Scene images"
        urls={projectAssets.sceneImages}
        icon="🎬"
      />
      <AssetGroup
        title="Video clips"
        urls={projectAssets.videoClips}
        icon="📹"
      />
      <AssetGroup
        title="Music track"
        urls={projectAssets.musicTrack}
        icon="🎵"
      />
    </div>
  </div>
)}
```

---

## Step 3 — AssetGroup component

```tsx
function AssetGroup({
  title,
  urls,
  icon,
}: {
  title: string
  urls: string[]
  icon: string
}) {
  if (urls.length === 0) return null

  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-zinc-500">
        {icon} {title} ({urls.length})
      </p>
      <div className="flex flex-col gap-1">
        {urls.map((url, i) => {
          const filename = url.split('/').pop()?.split('?')[0] ?? `asset-${i + 1}`
          const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)
          const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url)

          return (
            <div key={i} className="flex items-center gap-2 rounded-[6px] border border-zinc-100 bg-zinc-50 px-3 py-2">
              {isImage && (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={filename} className="h-8 w-5 shrink-0 rounded object-cover" />
                </a>
              )}
              {isVideo && (
                <span className="flex h-8 w-5 shrink-0 items-center justify-center rounded bg-zinc-200 text-[10px] text-zinc-500">
                  MP4
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-600">{filename}</span>
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
              >
                ↓
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Step 4 — DownloadAllButton component

Generates a `.txt` file of all asset URLs, one per line, labeled by type.
No server call needed — client-side Blob download.

```tsx
function DownloadAllButton({ assets }: { assets: ProjectAssets }) {
  const total =
    assets.characterImages.length +
    assets.sceneImages.length +
    assets.videoClips.length +
    assets.musicTrack.length

  if (total === 0) return null

  function downloadAll() {
    const lines: string[] = []

    if (assets.characterImages.length > 0) {
      lines.push('# Character images')
      lines.push(...assets.characterImages)
      lines.push('')
    }
    if (assets.sceneImages.length > 0) {
      lines.push('# Scene images')
      lines.push(...assets.sceneImages)
      lines.push('')
    }
    if (assets.videoClips.length > 0) {
      lines.push('# Video clips')
      lines.push(...assets.videoClips)
      lines.push('')
    }
    if (assets.musicTrack.length > 0) {
      lines.push('# Music track')
      lines.push(...assets.musicTrack)
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gigity-assets.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={downloadAll}
      className="rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
    >
      ↓ Download all ({total})
    </button>
  )
}
```

---

## Step 5 — Update step 10 instruction text

```ts
// src/lib/workflow-templates.ts — update stepNumber 10 instruction
{
  stepNumber: 10,
  title: 'Assemble in CapCut',
  tool: 'CapCut',
  type: 'external_instruction',
  instruction: `Assemble your video in CapCut.

All project assets are shown above. Download them before opening CapCut.

Assembly order:
1. Import all video clips (from Step 9) — arrange in scene order
2. Import the music track (from Step 4)
3. Sync music to scene cuts — chorus should hit the emotional peak
4. Add logo, captions, on-screen text (from your story script, Step 2)
5. Color grade — all scenes should feel consistent
6. Export:
   - 9:16 (1080×1920) for TikTok / Instagram Reels
   - 16:9 (1920×1080) for YouTube (optional)

When done, click "Mark as done" below.`,
  externalLink: 'https://www.capcut.com',
},
```

---

## Verify

1. Complete steps 4, 6, 9 (with asset URLs)
2. Open step 10 → asset panel shows grouped URLs with counts
3. Thumbnails visible for image assets
4. "↓" per asset → opens URL in new tab
5. "↓ Download all (N)" → downloads `gigity-assets.txt` with labeled URL list
6. Steps without assets don't show empty groups
7. Complete step 10 → green done state

---

**Output:** Step 10 becomes a production-ready assembly room. All assets visible, all downloadable.
User never needs to hunt through previous steps for URLs.

---

## All refinement plans complete

| Plan | Title | Status |
|------|-------|--------|
| R01 | Multi-brand support | Written |
| R02 | Delete & edit projects | Written |
| R03 | LLM output UX | Written |
| R04 | Cloudinary asset pipeline | Written |
| R05 | Story expansion (10-20 scenes) | Written |
| R06 | Step 4 music split + SunoAI | Written |
| R07 | Step 7 portrait images + DALL-E | Written |
| R08 | Step 8 per-image KlingAI prompts | Written |
| R09 | Step 10 CapCut asset panel | Written |

Build in order R01 → R02 → R03 → R04, then R05, then R06 (needs R04), then R07 (needs R04+R05), then R08 (needs R05+R07), then R09 (needs R04).
