# R08 — Step 8: Per-Image KlingAI Prompts

## What this builds

Step 8 (KlingAI Animation Prompts) currently generates generic animation prompts.
With 10-20 scenes (from R05), each prompt needs to:
1. Reference the specific scene image from step 7 (the image being animated)
2. Align motion to the matching lyric line
3. Stay story-consistent scene-to-scene

The current prompt generates one block without matching images to prompts. This plan
rewires step 8 to be image-anchored and lyric-aligned.

Depends on: R05 (10-20 scenes with lyric anchors), R07 (scene images)

## Files to change

```
src/lib/workflow-templates.ts     ← update step 8 promptTemplate
src/components/ExternalStepPanel.tsx  ← step 9: show per-scene clips with image reference
```

---

## Step 1 — Update step 8 prompt (KlingAI Animation Prompts)

```ts
// src/lib/workflow-templates.ts — replace stepNumber 8 promptTemplate
{
  stepNumber: 8,
  title: 'KlingAI Animation Prompts',
  tool: 'KlingAI',
  type: 'llm',
  promptTemplate: `Write KlingAI video animation prompts for each scene.

Story script (10-20 scenes):
{{step_2_output}}

Song lyrics:
{{step_3_output}}

Scene image prompts:
{{step_7_output}}

Character images (Cloudinary URLs):
{{step_6_output}}

For each scene, write a KlingAI prompt that animates the scene image into a short clip.
Each clip should:
- Start from the scene image (reference by scene number)
- Describe the camera motion (pan, zoom, static, pull back, etc.)
- Describe character movement or expression change
- Match the energy and mood of the lyric line
- Run 2-5 seconds

Format:

**Scene [N] — [short title]**
Lyric: "[matching lyric line from step 3]"
Image: Scene [N] image (from Step 7)
KlingAI prompt: [subject action], [camera motion], [mood/lighting], [duration in seconds]s

Example:
**Scene 3 — The Decision**
Lyric: "She looked up and saw the light"
Image: Scene 3 image (from Step 7)
KlingAI prompt: Woman slowly lifts her gaze, camera pulls back to reveal open doorway,
warm golden light blooms in background, hopeful atmosphere, 3s

Rules:
- Keep prompts short and concrete — KlingAI works best with clear simple motions
- Avoid complex multi-character interactions — KlingAI handles single-subject better
- Camera motion should emphasize the lyric's emotional peak
- Match clip energy to BPM: slow lyrics → slower motion, energetic chorus → faster cuts
- Total sequence length: 30-60 seconds when all clips are assembled`,
},
```

---

## Step 2 — Update step 9 external instruction

Step 9 currently has a generic "go generate" instruction. With per-image prompts, it
should show a step-by-step image-to-prompt pairing so the user knows which image to
upload with which prompt in KlingAI.

```ts
// src/lib/workflow-templates.ts — replace stepNumber 9 instruction
{
  stepNumber: 9,
  title: 'Generate Video Clips',
  tool: 'KlingAI',
  type: 'external_instruction',
  instruction: `Generate a KlingAI video clip for each scene using the prompts from Step 8.

For each scene:
1. Open KlingAI image-to-video
2. Upload the scene image (from Step 7 — or use the Cloudinary URL directly)
3. Paste the KlingAI prompt for that scene
4. Set duration to the seconds specified in the prompt (2-5s)
5. Generate and download

Once you have all clips:
- Paste a download folder link below (Google Drive, Dropbox, etc.)
- Or paste individual clip URLs one per line

Tip: Generate in batches — start the first 5 clips while reviewing the next 5 prompts.`,
  externalLink: 'https://kling.kuaishou.com',
  expiryWarning:
    'KlingAI video URLs expire — download clips immediately and store in cloud storage (Google Drive, Dropbox, etc.) before pasting URLs here.',
},
```

---

## Step 3 — ExternalStepPanel: step 9 scene reference panel

When step 9 is active, show a reference panel of scene images + prompts side by side.
The user needs to see both the image and the KlingAI prompt at the same time.

Add to `ExternalStepPanel.tsx`:

```tsx
{stepNumber === 9 && step8Output && step7Images && (
  <div className="mb-4">
    <p className="mb-2 text-[13px] font-medium text-zinc-700">Scene reference</p>
    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto rounded-[6px] border border-zinc-200">
      {parseKlingScenes(step8Output).map((scene, i) => (
        <div key={i} className="flex gap-3 border-b border-zinc-100 p-3 last:border-0">
          {step7Images[i] && (
            <a href={step7Images[i]} target="_blank" rel="noopener noreferrer">
              <img
                src={step7Images[i]}
                alt={scene.title}
                className="h-16 w-9 shrink-0 rounded object-cover"
              />
            </a>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-zinc-700">{scene.title}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 italic">"{scene.lyric}"</p>
            <p className="mt-1 text-[11px] text-zinc-600 line-clamp-2">{scene.prompt}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(scene.prompt)}
            className="shrink-0 self-start text-[11px] text-zinc-400 hover:text-zinc-600"
          >
            Copy
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

`parseKlingScenes` extracts the structured data from step 8 output:

```ts
function parseKlingScenes(text: string): Array<{
  title: string
  lyric: string
  prompt: string
}> {
  const blocks = text.split(/\*\*Scene \d+/).slice(1)
  return blocks.map(block => {
    const titleMatch = block.match(/^[^*\n]*/)
    const lyricMatch = block.match(/Lyric:\s*"([^"]+)"/)
    const promptMatch = block.match(/KlingAI prompt:\s*(.+?)(?=\n\n|\n\*\*|$)/s)
    return {
      title: `Scene ${titleMatch?.[0]?.replace(/[^—\w\s]/g, '').trim() ?? ''}`,
      lyric: lyricMatch?.[1] ?? '',
      prompt: promptMatch?.[1]?.trim() ?? '',
    }
  })
}
```

`step7Images` is the array of Cloudinary image URLs from step 6 and 7 (passed as props
from WorkflowClient via `previousStepImages: string[]`).

---

## Step 4 — WorkflowClient: pass step 7 images to step 9 panel

```ts
// src/components/WorkflowClient.tsx
// When rendering ExternalStepPanel for step 9:
const step7ImageUrls = steps[6]?.outputAssetUrl
  ?.split('\n')
  .map(u => u.trim())
  .filter(Boolean) ?? []

<ExternalStepPanel
  ...
  step7Images={step9 ? step7ImageUrls : undefined}
  step8Output={step9 ? steps[7]?.llmResponse ?? '' : undefined}
/>
```

---

## Verify

1. Generate step 8 → each scene has: **Scene N**, Lyric, Image reference, KlingAI prompt
2. Open step 9 → scene reference panel shows thumbnails + prompts + copy buttons
3. Copy button on a prompt → clipboard contains just that scene's KlingAI prompt
4. Step 8 prompt count matches step 2 scene count (10-20)
5. Lyric lines in step 8 prompts match lines from step 3 output

---

**Output:** Step 8 generates one KlingAI prompt per scene, each image-anchored and lyric-aligned.
Step 9 shows a side-by-side scene reference so the user never loses track of which image goes with which prompt.

**Next step:** [R09-step10-capcut-assets.md](R09-step10-capcut-assets.md) — CapCut asset panel + download all
