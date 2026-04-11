# R06 — Step 4: Music Prompt Split + SunoAI Dual Mode

## What this builds

Step 4 currently generates a single combined "music prompt". Users need two things:
1. **Lyrics display** — show the lyrics from step 3 so the user can copy them directly into SunoAI
2. **Style prompt** — the comma-separated musical descriptor (genre, BPM, mood, instruments)

Additionally, if `SUNO_API_KEY` is set, show a "Generate with SunoAI API" button.
If not set, show a link to open SunoAI web app.

## Files to change

```
src/lib/workflow-templates.ts       ← update step 4 promptTemplate
src/components/LLMStepPanel.tsx     ← detect step 4, show lyrics + style as separate panels
src/constants/env.server.ts         ← add SUNO_API_KEY
src/app/api/v1/workflow/[id]/generate/route.ts  ← add SunoAI API call for step 4
```

New environment variable (optional):
```bash
SUNO_API_KEY=your_suno_api_key   # optional — enables API generation button
```

---

## Step 1 — Update step 4 prompt

The prompt now returns two clearly labelled sections: `**Lyrics**` and `**Style Prompt**`.
This makes parsing trivial using the existing `parseBlocks()` from R03.

```ts
// src/lib/workflow-templates.ts — replace stepNumber 4 promptTemplate
{
  stepNumber: 4,
  title: 'Music Prompt',
  tool: 'SunoAI',
  type: 'llm',
  promptTemplate: `Create the SunoAI music generation package for this {{brand_name}} ad.

Brand tone: {{tone}}
Target audience: {{target_audience}}
Story script: {{step_2_output}}
Lyrics:
{{step_3_output}}

Return exactly two sections:

**Lyrics**
(paste the lyrics from Step 3 here verbatim — clean formatting for SunoAI input)

**Style Prompt**
(a comma-separated list of musical descriptors SunoAI understands)
Examples: "upbeat pop, 120 BPM, warm acoustic guitar, female vocals, hopeful, building energy"
         "lo-fi hip hop, 85 BPM, mellow, introspective, soft piano, light drums"

The style prompt should match:
- Brand tone: {{tone}}
- Audience: {{target_audience}}
- The emotional arc of the story (starts [opening mood], peaks at chorus, ends [closing mood])

Write a 1-sentence note after the style prompt explaining the musical direction.`,
},
```

---

## Step 2 — Add SUNO_API_KEY to env.server.ts

```ts
// src/constants/env.server.ts — add after CLOUDINARY vars
export const SUNO_API_KEY = process.env.SUNO_API_KEY
```

Update `.env.example`:
```bash
SUNO_API_KEY=                    # optional — enables SunoAI API generation in step 4
```

---

## Step 3 — LLMStepPanel: step 4 action area

After the LLM response is shown (done state), step 4 renders a dedicated action area
below the blocks. Detect by `stepDef.stepNumber === 4`.

Add this below `<ResponseBlocks content={state.llmResponse!} />` in the done state:

```tsx
{/* Step 4 — SunoAI action area */}
{stepDef?.stepNumber === 4 && (
  <div className="mt-4 rounded-[6px] border border-zinc-200 bg-zinc-50 p-4">
    <p className="mb-3 text-[13px] font-medium text-zinc-700">Open SunoAI and paste both sections</p>
    <div className="flex flex-wrap gap-2">
      <a
        href="https://suno.com/create"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-[6px] border border-zinc-200 bg-white px-4 py-2 text-[13px] text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 transition-colors"
      >
        Open SunoAI ↗
      </a>
      {hasSunoApiKey && (
        <SunoGenerateButton
          lyrics={extractBlock(state.llmResponse!, 'Lyrics')}
          stylePrompt={extractBlock(state.llmResponse!, 'Style Prompt')}
          onGenerated={url => onApprove?.({ outputAssetUrl: url })}
        />
      )}
    </div>
  </div>
)}
```

`hasSunoApiKey` comes from a new prop `sunoEnabled?: boolean` passed down from WorkflowClient.
WorkflowClient reads it from a `/api/v1/config` route (or passes it via server-rendered props).

---

## Step 4 — Helper: extractBlock

Add to `LLMStepPanel.tsx`:

```ts
// Extracts content under a **Label** heading from the parsed blocks
function extractBlock(content: string, label: string): string {
  const blocks = parseBlocks(content)
  return blocks.find(b => b.label === label)?.content.trim() ?? ''
}
```

---

## Step 5 — SunoGenerateButton component (API mode)

```tsx
// Inside LLMStepPanel.tsx (or a small inline component)
function SunoGenerateButton({
  lyrics,
  stylePrompt,
  onGenerated,
}: {
  lyrics: string
  stylePrompt: string
  onGenerated: (url: string) => void
}) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('generating')
    setError(null)
    const res = await fetch('/api/v1/workflow/suno/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics, stylePrompt }),
    })
    if (res.ok) {
      const data = await res.json()
      setStatus('done')
      onGenerated(data.url)
    } else {
      const err = await res.json().catch(() => ({ error: 'Generation failed' }))
      setStatus('error')
      setError(err.error)
    }
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={status === 'generating'}
        className="rounded-[6px] bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
      >
        {status === 'generating' ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating…
          </span>
        ) : status === 'done' ? (
          '✓ Generated'
        ) : (
          'Generate with SunoAI API'
        )}
      </button>
      {status === 'error' && error && (
        <p className="mt-1.5 text-[12px] text-red-500">{error}</p>
      )}
    </div>
  )
}
```

---

## Step 6 — SunoAI API route

```ts
// src/app/api/v1/workflow/suno/generate/route.ts
import { NextResponse } from 'next/server'
import { SUNO_API_KEY } from '@/constants/env.server'

export async function POST(req: Request) {
  if (!SUNO_API_KEY) {
    return NextResponse.json({ error: 'SunoAI API key not configured' }, { status: 501 })
  }

  const { lyrics, stylePrompt } = await req.json()

  if (!lyrics?.trim() || !stylePrompt?.trim()) {
    return NextResponse.json({ error: 'lyrics and stylePrompt are required' }, { status: 400 })
  }

  // SunoAI v3 API — generate a song
  const res = await fetch('https://studio-api.suno.ai/api/generate/v2/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: lyrics,
      tags: stylePrompt,
      mv: 'chirp-v3-5',
      make_instrumental: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `SunoAI error: ${err}` }, { status: 502 })
  }

  const data = await res.json()
  // SunoAI returns clips[0].audio_url
  const url = data?.clips?.[0]?.audio_url ?? data?.audio_url
  if (!url) {
    return NextResponse.json({ error: 'No audio URL in SunoAI response' }, { status: 502 })
  }

  return NextResponse.json({ url })
}
```

---

## Step 7 — WorkflowClient: pass sunoEnabled

Add to the server component that renders WorkflowClient (or pass via a `config` prop):

```tsx
// src/app/projects/[id]/page.tsx — pass sunoEnabled
import { SUNO_API_KEY } from '@/constants/env.server'

// In the JSX:
<WorkflowClient
  project={project}
  sunoEnabled={!!SUNO_API_KEY}
/>
```

WorkflowClient passes `sunoEnabled` down to LLMStepPanel when `activeStep === 4`.

---

## Verify

1. Generate step 4 → response split into **Lyrics** block and **Style Prompt** block
2. Copy buttons on each block work
3. "Open SunoAI ↗" link opens suno.com/create in a new tab
4. If `SUNO_API_KEY` is set: "Generate with SunoAI API" button appears and shows spinner
5. If `SUNO_API_KEY` is not set: only the external link shows
6. On API success: approve with audio URL stored in DB

---

**Output:** Step 4 becomes a lyrics + style prompt pair. Users can copy into SunoAI web app
or generate directly via API if they have a key.

**Next step:** [R07-step7-scene-images.md](R07-step7-scene-images.md) — portrait images + DALL-E integration
