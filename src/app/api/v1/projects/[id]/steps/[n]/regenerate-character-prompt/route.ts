/* eslint-disable @typescript-eslint/no-explicit-any */
import { llmModelForWorkflowGenerateStep } from '@/constants/workflow-llm-models'
import { apiHandler } from '@/lib/api-handler'
import { jaccardSimilarity } from '@/lib/jaccard-similarity'
import { buildSystemMessage, callLLM } from '@/lib/llm'
import VideoProject from '@/models/VideoProject'
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

export const POST = apiHandler(
  async (_req, routeCtx) => {
    const { id, n } = await routeCtx!.params
    const stepNumber = parseInt(n, 10)
    if (stepNumber !== 5) {
      return NextResponse.json(
        { error: 'Character prompt regeneration is only for step 5' },
        { status: 400 }
      )
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await _req.json().catch(() => ({}))
    const { characterName, currentPrompt, characterStyle } = body as {
      characterName?: string
      currentPrompt?: string
      characterStyle?: string
    }
    const name = characterName?.trim()
    const oldPrompt = currentPrompt?.trim()
    if (!name || !oldPrompt) {
      return NextResponse.json(
        { error: 'characterName and currentPrompt are required' },
        { status: 400 }
      )
    }

    const project = await VideoProject.findById(id).populate('brandProfileId')
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.steps[3]?.status !== 'done') {
      return NextResponse.json(
        { error: 'Complete step 4 before regenerating character prompts' },
        { status: 400 }
      )
    }

    const brand = project.brandProfileId as any
    const storyScript = project.steps[1]?.llmResponse ?? ''
    const visualStyle =
      characterStyle?.trim() ||
      'Use one clear consistent visual style across all characters.'

    const systemMessage = buildSystemMessage(brand, project.steps as any[])
    const userPrompt = [
      `Rewrite exactly one DALL-E prompt for character "${name}".`,
      'Do not regenerate all characters. Do not include markdown, labels, or quotes.',
      'Return only one single-line prompt text.',
      '',
      `Character visual style requirement: ${visualStyle}`,
      '',
      'Story script context:',
      storyScript,
      '',
      'Current prompt to improve:',
      oldPrompt,
      '',
      'Hard constraints:',
      '- Single subject only',
      '- Full body, vertical 9:16 portrait',
      '- Simple neutral background',
      '- No props and no interactions',
      '- Keep the same character identity and role',
      '- Output one line only',
    ].join('\n')

    const llmResponse = await callLLM(
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ],
      { model: llmModelForWorkflowGenerateStep(5) }
    )

    let newPrompt = llmResponse.replace(/\s*\n+\s*/g, ' ').trim()
    if (newPrompt && jaccardSimilarity(oldPrompt, newPrompt) > 0.82) {
      const forceDifferentPrompt = [
        `Rewrite this prompt for "${name}" again and make it clearly different from the original wording.`,
        'Keep the same character identity and all constraints.',
        'Change sentence structure, descriptor choices, and wording significantly.',
        'Return one line only, no markdown, no labels.',
        '',
        'Original prompt:',
        oldPrompt,
        '',
        'First regenerated attempt (too similar):',
        newPrompt,
      ].join('\n')
      const second = await callLLM(
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: forceDifferentPrompt },
        ],
        { model: llmModelForWorkflowGenerateStep(5) }
      )
      const secondPrompt = second.replace(/\s*\n+\s*/g, ' ').trim()
      if (secondPrompt) newPrompt = secondPrompt
    }
    if (!newPrompt) {
      return NextResponse.json({ error: 'Empty prompt generated' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, prompt: newPrompt })
  },
  { auth: true }
)

