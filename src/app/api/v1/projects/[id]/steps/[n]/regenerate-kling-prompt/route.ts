/* eslint-disable @typescript-eslint/no-explicit-any */
import { llmModelForWorkflowGenerateStep } from '@/constants/workflow-llm-models'
import { apiHandler } from '@/lib/api-handler'
import { jaccardSimilarity } from '@/lib/jaccard-similarity'
import { buildSystemMessage, callLLM } from '@/lib/llm'
import VideoProject from '@/models/VideoProject'
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

export const POST = apiHandler(
  async (req, routeCtx) => {
    const { id, n } = await routeCtx!.params
    const stepNumber = parseInt(n, 10)
    if (stepNumber !== 7) {
      return NextResponse.json(
        { error: 'Kling prompt regeneration is only for step 7' },
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
    const oldPrompt = currentPrompt?.trim()
    if (!oldPrompt) {
      return NextResponse.json(
        { error: 'currentPrompt is required' },
        { status: 400 }
      )
    }

    const project = await VideoProject.findById(id).populate('brandProfileId')
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.steps[5]?.status !== 'done') {
      return NextResponse.json(
        { error: 'Complete step 6 before regenerating animated scene prompts' },
        { status: 400 }
      )
    }

    const brand = project.brandProfileId as any
    const storyScript = project.steps[1]?.llmResponse ?? ''
    const songLyrics = project.steps[2]?.llmResponse ?? ''
    const sceneImagePrompts = project.steps[5]?.llmResponse ?? ''
    const systemMessage = buildSystemMessage(brand, project.steps as any[])
    const sceneTitleValue = (sceneTitle ?? '').trim() || 'N/A'
    const sceneLyricValue = (sceneLyric ?? '').trim() || 'N/A'

    const userPrompt = [
      'Rewrite exactly one KlingAI animation prompt.',
      'Do not regenerate all scenes.',
      'Return only the rewritten KlingAI prompt text in one line.',
      'No markdown, no labels, no quotes.',
      '',
      `Scene title: ${sceneTitleValue}`,
      `Scene lyric: ${sceneLyricValue}`,
      '',
      'Story context:',
      storyScript,
      '',
      'Lyrics context:',
      songLyrics,
      '',
      'Scene image prompts context:',
      sceneImagePrompts,
      '',
      'Current KlingAI prompt to improve:',
      oldPrompt,
      '',
      'Constraints:',
      '- Keep same scene intent and continuity',
      '- Keep a single clear subject action',
      '- Keep one camera direction',
      '- Keep brief background and mood-lighting details',
      '- Keep concise short-form timing language',
      '- Output one single line only',
    ].join('\n')

    const llmResponse = await callLLM(
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ],
      { model: llmModelForWorkflowGenerateStep(7) }
    )

    let newPrompt = llmResponse.replace(/\s*\n+\s*/g, ' ').trim()
    if (newPrompt && jaccardSimilarity(oldPrompt, newPrompt) > 0.82) {
      const forceDifferentPrompt = [
        'Rewrite this KlingAI prompt again and make it clearly different in wording and structure.',
        'Keep the same scene intent and all constraints.',
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
        { model: llmModelForWorkflowGenerateStep(7) }
      )
      const secondPrompt = second.replace(/\s*\n+\s*/g, ' ').trim()
      if (secondPrompt) newPrompt = secondPrompt
    }

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

