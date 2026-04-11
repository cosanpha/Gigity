# 03d — Workflow Engine: llm.ts + Tests

## What this builds

Three functions in `llm.ts`: `buildSystemMessage` (assembles brand context + prior
step outputs), `buildMessages` (full message array for the API call), and `callLLM`
(bare `fetch` to the OpenAI-compatible endpoint). Plus unit tests for the first two.

## Prerequisites

[03c-interpolate.md](03c-interpolate.md) — `interpolate()` used by the generate route.
[03b-workflow-templates.md](03b-workflow-templates.md) — `getStepDefinition()` used here.

## Files to create

```
src/lib/llm.ts
src/lib/llm.test.ts
```

---

## `src/lib/llm.ts`

```ts
import { OPENAI_API_KEY, LLM_BASE_URL, LLM_MODEL } from '@/constants/env.server'
import { getStepDefinition } from './workflow-templates'
import type { IBrandProfile } from '@/models/BrandProfile'
import type { IMessage, IWorkflowStep } from '@/models/VideoProject'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/**
 * Build the system message for a generate call.
 * Contains brand context + all prior approved step outputs.
 * NOT stored in DB — recomputed on every call.
 */
export function buildSystemMessage(
  brand: Pick<IBrandProfile, 'name' | 'description' | 'targetAudience' | 'tone' | 'platforms' | 'exampleVideoUrls'>,
  steps: IWorkflowStep[]
): string {
  const lines: string[] = []

  lines.push(`You are a creative AI assistant helping produce a short-form video ad for ${brand.name}.`)
  lines.push(``)
  lines.push(`Brand: ${brand.name}`)
  lines.push(`Description: ${brand.description}`)
  lines.push(`Target audience: ${brand.targetAudience || 'Not specified'}`)
  lines.push(`Tone: ${brand.tone || 'Not specified'}`)
  lines.push(`Platforms: ${brand.platforms.join(', ') || 'Not specified'}`)

  if (brand.exampleVideoUrls.length > 0) {
    lines.push(`Reference videos: ${brand.exampleVideoUrls.join(', ')}`)
  }

  // Include all prior approved LLM step outputs (steps 1–8 only)
  const doneSteps = steps.filter(
    s => s.status === 'done' && s.stepNumber <= 8 && s.llmResponse
  )

  if (doneSteps.length > 0) {
    lines.push(``)
    lines.push(`--- Prior approved outputs ---`)
    for (const step of doneSteps) {
      const def = getStepDefinition(step.stepNumber)
      const label = def?.title ?? `Step ${step.stepNumber}`
      lines.push(`Step ${step.stepNumber} (${label}):`)
      lines.push(step.llmResponse!)
    }
  }

  return lines.join('\n')
}

/**
 * Build the full messages array for a chat completion call.
 *
 * Message order:
 *   [system] brand context + prior steps
 *   [user]   interpolated prompt template (the "task" for this step)
 *   [...]    existing conversation history (follow-up thread)
 *   [user]   followUpMessage if provided (new follow-up being sent now)
 */
export function buildMessages(
  systemMessage: string,
  userPrompt: string,
  conversation: IMessage[],
  followUpMessage?: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userPrompt },
    ...conversation.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]
  if (followUpMessage) {
    messages.push({ role: 'user', content: followUpMessage })
  }
  return messages
}

/**
 * Call the LLM API. Returns the assistant's response text.
 * Throws on API error or missing API key.
 */
export async function callLLM(messages: ChatMessage[]): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: LLM_MODEL, messages }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LLM API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  return data.choices[0].message.content as string
}
```

---

## `src/lib/llm.test.ts`

Tests for `buildSystemMessage` and `buildMessages`. No mocking needed — both are
pure functions.

```ts
import { describe, expect, it } from 'bun:test'
import { buildSystemMessage, buildMessages } from './llm'

const brandBase = {
  name: 'Deewas',
  description: 'Personal finance app',
  targetAudience: 'Young adults',
  tone: 'Warm, Modern',
  platforms: ['TikTok', 'Instagram Reels'],
  exampleVideoUrls: [],
}

const noSteps: any[] = []

describe('buildSystemMessage', () => {

  it('includes brand context with no prior steps', () => {
    const msg = buildSystemMessage(brandBase, noSteps)
    expect(msg).toContain('Deewas')
    expect(msg).toContain('Personal finance app')
    expect(msg).toContain('Young adults')
    expect(msg).toContain('Warm, Modern')
    expect(msg).toContain('TikTok')
    expect(msg).not.toContain('Prior approved outputs')
  })

  it('includes prior approved step outputs', () => {
    const steps: any[] = [
      { stepNumber: 1, status: 'done', llmResponse: 'Campaign brief here', outputAssetUrl: null },
      { stepNumber: 2, status: 'done', llmResponse: 'Story script here', outputAssetUrl: null },
    ]
    const msg = buildSystemMessage(brandBase, steps)
    expect(msg).toContain('Prior approved outputs')
    expect(msg).toContain('Campaign brief here')
    expect(msg).toContain('Story script here')
  })

  it('excludes steps that are not done', () => {
    const steps: any[] = [
      { stepNumber: 1, status: 'pending', llmResponse: 'Draft', outputAssetUrl: null },
    ]
    const msg = buildSystemMessage(brandBase, steps)
    expect(msg).not.toContain('Prior approved outputs')
    expect(msg).not.toContain('Draft')
  })

  it('excludes step outputs beyond step 8', () => {
    const steps: any[] = [
      { stepNumber: 9, status: 'done', llmResponse: 'Should be excluded', outputAssetUrl: null },
    ]
    const msg = buildSystemMessage(brandBase, steps)
    expect(msg).not.toContain('Should be excluded')
  })

})

describe('buildMessages', () => {

  it('returns system + user for first generate (no conversation)', () => {
    const msgs = buildMessages('system context', 'user prompt', [])
    expect(msgs).toHaveLength(2)
    expect(msgs[0]).toEqual({ role: 'system', content: 'system context' })
    expect(msgs[1]).toEqual({ role: 'user', content: 'user prompt' })
  })

  it('appends followUpMessage as last user message', () => {
    const msgs = buildMessages(
      'system',
      'prompt',
      [{ role: 'assistant', content: 'Prior response' }],
      'Make it shorter'
    )
    expect(msgs).toHaveLength(4)
    expect(msgs[3]).toEqual({ role: 'user', content: 'Make it shorter' })
  })

  it('includes full conversation history between prompt and follow-up', () => {
    const conversation = [
      { role: 'assistant' as const, content: 'First response' },
      { role: 'user' as const, content: 'Follow-up 1' },
      { role: 'assistant' as const, content: 'Second response' },
    ]
    const msgs = buildMessages('sys', 'initial prompt', conversation, 'Follow-up 2')
    expect(msgs).toHaveLength(6)
    expect(msgs[2].content).toBe('First response')
    expect(msgs[5].content).toBe('Follow-up 2')
  })

})
```

---

## Run tests

```bash
bun test src/lib/llm.test.ts
```

All 7 tests should pass.

---

**Output:** `buildSystemMessage`, `buildMessages`, `callLLM` with 7 passing unit tests.

**Next step:** [03e-api-create-project.md](03e-api-create-project.md) — POST /api/v1/projects
