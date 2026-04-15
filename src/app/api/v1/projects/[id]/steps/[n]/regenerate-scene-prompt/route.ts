/* eslint-disable @typescript-eslint/no-explicit-any */
import { llmModelForWorkflowGenerateStep } from '@/constants/workflow-llm-models'
import { apiHandler } from '@/lib/api-handler'
import { jaccardSimilarity } from '@/lib/jaccard-similarity'
import { buildSystemMessage, callLLM } from '@/lib/llm'
import VideoProject from '@/models/VideoProject'
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

function extractHttpUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s,]+/gi) ?? []
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of matches) {
    const cleaned = m.trim()
    if (!cleaned || seen.has(cleaned)) continue
    seen.add(cleaned)
    out.push(cleaned)
  }
  return out
}

function mergeRefsIntoPrompt(prompt: string, refs: string[]): string {
  if (refs.length === 0) return prompt
  const existing = new Set(extractHttpUrls(prompt))
  const missing = refs.filter(r => !existing.has(r))
  if (missing.length === 0) return prompt
  return `${missing.join(', ')}, ${prompt}`.trim()
}

export const POST = apiHandler(
  async (req, routeCtx) => {
    const { id, n } = await routeCtx!.params
    const stepNumber = parseInt(n, 10)
    if (stepNumber !== 6) {
      return NextResponse.json(
        { error: 'Scene prompt regeneration is only for step 6' },
        { status: 400 }
      )
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { sceneTitle, sceneLyric, currentPrompt } = body as {
      sceneTitle?: string
      sceneLyric?: string
      currentPrompt?: string
    }
    const prompt = currentPrompt?.trim()
    if (!prompt) {
      return NextResponse.json(
        { error: 'currentPrompt is required' },
        { status: 400 }
      )
    }

    const project = await VideoProject.findById(id).populate('brandProfileId')
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.steps[4]?.status !== 'done') {
      return NextResponse.json(
        { error: 'Complete step 5 before regenerating scene prompts' },
        { status: 400 }
      )
    }

    const brand = project.brandProfileId as any
    const storyScript = project.steps[1]?.llmResponse ?? ''
    const songLyrics = project.steps[2]?.llmResponse ?? ''
    const referenceUrls = extractHttpUrls(prompt)
    const systemMessage = buildSystemMessage(brand, project.steps as any[])

    const userPrompt = [
      'Rewrite exactly one scene image prompt for DALL-E.',
      'Do not regenerate all scenes.',
      'Return only the new prompt text, one line, no markdown, no labels.',
      '',
      `Scene title: ${(sceneTitle ?? '').trim() || 'N/A'}`,
      `Scene lyric: ${(sceneLyric ?? '').trim() || 'N/A'}`,
      '',
      'Story context:',
      storyScript,
      '',
      'Lyrics context:',
      songLyrics,
      '',
      'Current prompt to improve:',
      prompt,
      referenceUrls.length > 0
        ? `Reference URLs to keep in the new prompt: ${referenceUrls.join(', ')}`
        : '',
      '',
      'Constraints:',
      '- Keep same scene intent and continuity',
      '- Keep portrait composition for short-form video',
      '- Keep concrete setting, lighting, camera angle, and mood',
      '- Keep all existing reference image URLs in the new prompt',
      '- Output one single line only',
    ].join('\n')

    const llmResponse = await callLLM(
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ],
      { model: llmModelForWorkflowGenerateStep(6) }
    )

    let oneLine = llmResponse.replace(/\s*\n+\s*/g, ' ').trim()
    if (oneLine && jaccardSimilarity(prompt, oneLine) > 0.82) {
      const forceDifferentPrompt = [
        'Rewrite this scene prompt again and make it clearly different in wording and structure.',
        'Keep the same scene intent and all constraints.',
        'Keep all existing reference URLs in the prompt.',
        'Return one line only, no markdown, no labels.',
        '',
        'Original prompt:',
        prompt,
        '',
        'First regenerated attempt (too similar):',
        oneLine,
      ].join('\n')
      const second = await callLLM(
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: forceDifferentPrompt },
        ],
        { model: llmModelForWorkflowGenerateStep(6) }
      )
      const secondOneLine = second.replace(/\s*\n+\s*/g, ' ').trim()
      if (secondOneLine) oneLine = secondOneLine
    }
    const newPrompt = mergeRefsIntoPrompt(oneLine, referenceUrls)
    if (!newPrompt) {
      return NextResponse.json(
        { error: 'Empty prompt generated' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, prompt: newPrompt })
  },
  { auth: true }
)

