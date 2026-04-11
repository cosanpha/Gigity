# R07 — Step 7: Portrait Images + DALL-E Integration

## What this builds

Step 7 (Scene Image Prompts) and Step 6 (Generate Character Images) get two upgrades:

1. **Portrait ratio everywhere** — all Midjourney prompts use `--ar 9:16` (covered in R05 for step 7;
   this plan also fixes step 5 character prompts to use `--ar 9:16`)
2. **DALL-E integration in step 6** — instead of only pasting external URLs, user can
   choose to generate directly via DALL-E API. The image is auto-uploaded to Cloudinary (R04).
3. **DALL-E integration in a new step 7b** — after generating scene image prompts, user
   can generate images directly in Gigity via DALL-E and get Cloudinary URLs back.

## Why

Users paste Midjourney or DALL-E URLs that expire in 24-72 hours. With DALL-E API +
Cloudinary upload wired together, the workflow becomes: generate → permanently stored →
continue. No copying URLs, no re-hosting.

Depends on: R04 (Cloudinary upload), R05 (9:16 portrait ratio in step 7 prompt)

## New environment variable

```bash
OPENAI_API_KEY=your_openai_api_key   # already required — used for DALL-E
```

No new vars needed. DALL-E uses the same `OPENAI_API_KEY`.

## Files to change

```
src/lib/workflow-templates.ts                        ← fix step 5 character prompt ratio
src/app/api/v1/workflow/dalle/generate/route.ts      ← new: DALL-E image generation endpoint
src/components/ExternalStepPanel.tsx                 ← add DALL-E generate UI in steps 6 and 7-generate
```

## Files to create

```
src/app/api/v1/workflow/dalle/generate/route.ts
```

---

## Step 1 — Fix step 5 character prompts to portrait ratio

```ts
// src/lib/workflow-templates.ts — update stepNumber 5 promptTemplate
// Change: --ar 1:1 → --ar 9:16
// Old line:
//   Midjourney prompt: Portrait of [description], soft studio lighting, clean background --ar 1:1 --style raw
// New line:
    promptTemplate: `Based on this story script, identify all on-screen characters and write
Midjourney image prompts for each one.

Story script:
{{step_2_output}}

For each character:
1. Name and role in the story (1 sentence)
2. Visual description (age, ethnicity, style, expression, body language)
3. Midjourney prompt

Format:
**Character — [Name] ([role])**
Description: ...
Midjourney prompt: Portrait of [description], soft studio lighting, clean background, cinematic --ar 9:16 --style raw

Be specific: "Vietnamese woman, 26, office casual, warm smile" beats "young professional woman".`,
```

---

## Step 2 — DALL-E image generation API route

```ts
// src/app/api/v1/workflow/dalle/generate/route.ts
import { NextResponse } from 'next/server'
import { OPENAI_API_KEY } from '@/constants/env.server'
import { uploadFromUrl, isCloudinaryUrl } from '@/lib/cloudinary'

export async function POST(req: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 501 })
  }

  const body = await req.json()
  const { prompt, size = '1024x1792' } = body as { prompt?: string; size?: string }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  // Call DALL-E 3
  const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,        // 1024x1792 = portrait 9:16
      quality: 'standard',
    }),
  })

  if (!dalleRes.ok) {
    const err = await dalleRes.text()
    return NextResponse.json({ error: `DALL-E error: ${err}` }, { status: 502 })
  }

  const dalleData = await dalleRes.json()
  const tempUrl = dalleData?.data?.[0]?.url

  if (!tempUrl) {
    return NextResponse.json({ error: 'No image URL in DALL-E response' }, { status: 502 })
  }

  // Upload to Cloudinary immediately — DALL-E URLs expire in ~1 hour
  const cloudUrl = isCloudinaryUrl(tempUrl) ? tempUrl : await uploadFromUrl(tempUrl, 'gigity/images')

  return NextResponse.json({ url: cloudUrl, tempUrl })
}
```

Size `1024x1792` is the DALL-E 3 portrait size (closest to 9:16).

---

## Step 3 — DalleGenerateButton component

Used in both step 6 (character images) and wherever scene prompts are generated. Add to
`ExternalStepPanel.tsx` — shown when the step has LLM prompts available (from previous step output).

```tsx
// Add inside ExternalStepPanel.tsx (or a separate file if preferred)
'use client'

interface DalleGenerateButtonProps {
  prompt: string
  onGenerated: (cloudUrl: string) => void
}

export function DalleGenerateButton({ prompt, onGenerated }: DalleGenerateButtonProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  async function generate() {
    setStatus('generating')
    setError(null)

    const res = await fetch('/api/v1/workflow/dalle/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '1024x1792' }),
    })

    if (res.ok) {
      const data = await res.json()
      setResultUrl(data.url)
      setStatus('done')
      onGenerated(data.url)
    } else {
      const err = await res.json().catch(() => ({ error: 'Generation failed' }))
      setStatus('error')
      setError(err.error)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={generate}
        disabled={status === 'generating'}
        className="rounded-[6px] bg-indigo-500 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors w-fit"
      >
        {status === 'generating' ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating…
          </span>
        ) : status === 'done' ? '✓ Generated' : 'Generate with DALL-E'}
      </button>

      {status === 'done' && resultUrl && (
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-green-500">✓</span>
          <a href={resultUrl} target="_blank" rel="noopener noreferrer"
             className="truncate text-indigo-500 hover:underline max-w-[300px]">{resultUrl}</a>
        </div>
      )}

      {status === 'error' && error && (
        <p className="text-[12px] text-red-500">{error}</p>
      )}
    </div>
  )
}
```

---

## Step 4 — Wire DalleGenerateButton into ExternalStepPanel for step 6

In `ExternalStepPanel.tsx`, when `stepNumber === 6`, show DALL-E generate buttons
alongside the URL paste area. The previous step's output contains the prompts.

```tsx
// In ExternalStepPanel — add below the AssetUrlInput
{stepNumber === 6 && previousStepOutput && (
  <div className="mt-4">
    <p className="mb-3 text-[13px] font-medium text-zinc-700">Or generate directly with DALL-E:</p>
    <div className="flex flex-col gap-3">
      {extractCharacterPrompts(previousStepOutput).map((item, i) => (
        <div key={i} className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-2 text-[12px] font-medium text-zinc-600">{item.name}</p>
          <pre className="mb-2 text-[11px] text-zinc-500 whitespace-pre-wrap font-sans line-clamp-2">
            {item.prompt}
          </pre>
          <DalleGenerateButton
            prompt={item.prompt}
            onGenerated={url => appendAssetUrl(url)}
          />
        </div>
      ))}
    </div>
  </div>
)}
```

`extractCharacterPrompts(text)` parses the step 5 output:

```ts
function extractCharacterPrompts(text: string): Array<{ name: string; prompt: string }> {
  const blocks = text.split(/\*\*Character — /).slice(1)
  return blocks.map(block => {
    const name = block.split('\n')[0].replace(/\*\*.*/, '').trim()
    const promptMatch = block.match(/Midjourney prompt:\s*(.+)/s)
    const prompt = promptMatch?.[1]?.split('\n')[0]?.trim() ?? ''
    return { name, prompt }
  })
}
```

`appendAssetUrl` appends the generated URL to the current asset URL state in WorkflowClient.
Pass it as a prop: `onAppendAssetUrl: (url: string) => void`.

---

## Step 5 — ExternalStepPanel props update

```ts
// Add to ExternalStepPanelProps
previousStepOutput?: string        // output from the LLM step before this external step
onAppendAssetUrl?: (url: string) => void  // append a URL to the asset URL list
```

WorkflowClient passes `previousStepOutput` as the `llmResponse` from `steps[stepNumber - 1]`.

---

## Verify

1. Step 5 → character prompts now use `--ar 9:16`
2. Step 7 → scene prompts use `--ar 9:16` (from R05)
3. Open step 6 → DALL-E buttons appear per character prompt
4. Click "Generate with DALL-E" → spinner → image generated → Cloudinary URL shown
5. Cloudinary URL auto-appended to asset URL list
6. Approve step 6 → Cloudinary URLs stored in DB

---

**Output:** Character and scene image prompts are portrait ratio. DALL-E generates directly
in-app and uploads to Cloudinary automatically.

**Next step:** [R08-step8-kling-prompts.md](R08-step8-kling-prompts.md) — per-image KlingAI prompts
