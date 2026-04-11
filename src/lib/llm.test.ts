import { describe, expect, it, mock } from 'bun:test'

mock.module('server-only', () => ({}))
mock.module('@/constants/env.server', () => ({
  OPENAI_API_KEY: 'test-key',
  LLM_BASE_URL: 'https://api.openai.com/v1',
  LLM_MODEL: 'gpt-4.1-mini',
}))

const { buildSystemMessage, buildMessages } = await import('./llm')

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
