import { OPENAI_API_KEY, LLM_BASE_URL, LLM_MODEL } from '@/constants/env.server'
import { getStepDefinition } from './workflow-templates'
import type { IBrandProfile } from '@/models/BrandProfile'
import type { IMessage, IWorkflowStep } from '@/models/VideoProject'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/**
 * Build the system message for a generate call.
 * Contains brand context + all prior approved step outputs.
 * NOT stored in DB - recomputed on every call.
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

  // Include all prior approved LLM step outputs (steps 1–7 only)
  const doneSteps = steps.filter(
    s => s.status === 'done' && s.stepNumber <= 7 && s.llmResponse
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
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM returned empty response')
  return content as string
}
