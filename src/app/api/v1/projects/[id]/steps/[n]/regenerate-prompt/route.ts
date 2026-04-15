/* eslint-disable @typescript-eslint/no-explicit-any */
import { llmModelForWorkflowGenerateStep } from '@/constants/workflow-llm-models'
import { apiHandler } from '@/lib/api-handler'
import { jaccardSimilarity } from '@/lib/jaccard-similarity'
import { buildSystemMessage, callLLM } from '@/lib/llm'
import { extractHttpUrlsFromPromptText } from '@/lib/url-utils'
import VideoProject from '@/models/VideoProject'
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

// Shared: retry if output is too similar to input
async function generateWithRetry(
  messages: { role: 'system' | 'user'; content: string }[],
  oldPrompt: string,
  retryMessages: (attempt: string) => { role: 'system' | 'user'; content: string }[],
  model: string
): Promise<string> {
  const llmResponse = await callLLM(messages, { model })
  let newPrompt = llmResponse.replace(/\s*\n+\s*/g, ' ').trim()
  if (newPrompt && jaccardSimilarity(oldPrompt, newPrompt) > 0.82) {
    const second = await callLLM(retryMessages(newPrompt), { model })
    const secondPrompt = second.replace(/\s*\n+\s*/g, ' ').trim()
    if (secondPrompt) newPrompt = secondPrompt
  }
  return newPrompt
}

// Step 5: character prompt
function buildCharacterMessages(
  systemMessage: string,
  body: any,
  project: any
): { messages: any[]; retryMessages: (attempt: string) => any[] } {
  const { characterName, currentPrompt, characterStyle } = body
  const name = characterName?.trim()
  const oldPrompt = currentPrompt?.trim()
  const visualStyle =
    characterStyle?.trim() ||
    'Use one clear consistent visual style across all characters.'
  const storyScript = project.steps[1]?.llmResponse ?? ''

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

  const retryMessages = (attempt: string) => [
    { role: 'system', content: systemMessage },
    {
      role: 'user',
      content: [
        `Rewrite this prompt for "${name}" again and make it clearly different from the original wording.`,
        'Keep the same character identity and all constraints.',
        'Change sentence structure, descriptor choices, and wording significantly.',
        'Return one line only, no markdown, no labels.',
        '',
        'Original prompt:',
        oldPrompt,
        '',
        'First regenerated attempt (too similar):',
        attempt,
      ].join('\n'),
    },
  ]

  return {
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt },
    ],
    retryMessages,
  }
}

// Step 6: scene prompt
function buildSceneMessages(
  systemMessage: string,
  body: any,
  project: any
): { messages: any[]; retryMessages: (attempt: string) => any[]; referenceUrls: string[] } {
  const { sceneTitle, sceneLyric, currentPrompt } = body
  const prompt = currentPrompt?.trim()
  const referenceUrls = extractHttpUrlsFromPromptText(prompt)
  const storyScript = project.steps[1]?.llmResponse ?? ''
  const songLyrics = project.steps[2]?.llmResponse ?? ''

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

  const retryMessages = (attempt: string) => [
    { role: 'system', content: systemMessage },
    {
      role: 'user',
      content: [
        'Rewrite this scene prompt again and make it clearly different in wording and structure.',
        'Keep the same scene intent and all constraints.',
        'Keep all existing reference URLs in the prompt.',
        'Return one line only, no markdown, no labels.',
        '',
        'Original prompt:',
        prompt,
        '',
        'First regenerated attempt (too similar):',
        attempt,
      ].join('\n'),
    },
  ]

  return {
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt },
    ],
    retryMessages,
    referenceUrls,
  }
}

// Step 7: Kling prompt
function buildKlingMessages(
  systemMessage: string,
  body: any,
  project: any
): { messages: any[]; retryMessages: (attempt: string) => any[] } {
  const { sceneTitle, sceneLyric, currentPrompt } = body
  const oldPrompt = currentPrompt?.trim()
  const storyScript = project.steps[1]?.llmResponse ?? ''
  const songLyrics = project.steps[2]?.llmResponse ?? ''
  const sceneImagePrompts = project.steps[5]?.llmResponse ?? ''
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

  const retryMessages = (attempt: string) => [
    { role: 'system', content: systemMessage },
    {
      role: 'user',
      content: [
        'Rewrite this KlingAI prompt again and make it clearly different in wording and structure.',
        'Keep the same scene intent and all constraints.',
        'Return one line only, no markdown, no labels.',
        '',
        'Original prompt:',
        oldPrompt,
        '',
        'First regenerated attempt (too similar):',
        attempt,
      ].join('\n'),
    },
  ]

  return {
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt },
    ],
    retryMessages,
  }
}

export const POST = apiHandler(
  async (req, routeCtx) => {
    const { id, n } = await routeCtx!.params
    const stepNumber = parseInt(n, 10)

    if (![5, 6, 7].includes(stepNumber)) {
      return NextResponse.json(
        { error: 'Prompt regeneration is only available for steps 5, 6, and 7' },
        { status: 400 }
      )
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))

    // Step-specific required field validation
    if (stepNumber === 5) {
      const name = (body.characterName ?? '').trim()
      const prompt = (body.currentPrompt ?? '').trim()
      if (!name || !prompt) {
        return NextResponse.json(
          { error: 'characterName and currentPrompt are required' },
          { status: 400 }
        )
      }
    } else {
      if (!(body.currentPrompt ?? '').trim()) {
        return NextResponse.json(
          { error: 'currentPrompt is required' },
          { status: 400 }
        )
      }
    }

    const project = await VideoProject.findById(id).populate('brandProfileId')
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Prerequisite step checks
    const prereqIndex = stepNumber - 2 // step 5 → index 3, step 6 → index 4, step 7 → index 5
    if (project.steps[prereqIndex]?.status !== 'done') {
      const prereqStep = stepNumber - 1
      return NextResponse.json(
        { error: `Complete step ${prereqStep} before regenerating prompts` },
        { status: 400 }
      )
    }

    const brand = project.brandProfileId as any
    const systemMessage = buildSystemMessage(brand, project.steps as any[])
    const model = llmModelForWorkflowGenerateStep(stepNumber)

    let newPrompt: string

    if (stepNumber === 5) {
      const { messages, retryMessages } = buildCharacterMessages(systemMessage, body, project)
      const oldPrompt = (body.currentPrompt ?? '').trim()
      newPrompt = await generateWithRetry(messages as any, oldPrompt, retryMessages as any, model)
    } else if (stepNumber === 6) {
      const { messages, retryMessages, referenceUrls } = buildSceneMessages(systemMessage, body, project)
      const oldPrompt = (body.currentPrompt ?? '').trim()
      let raw = await generateWithRetry(messages as any, oldPrompt, retryMessages as any, model)
      // Re-inject reference URLs that the model may have dropped
      if (referenceUrls.length > 0) {
        const existing = new Set(raw.match(/https?:\/\/[^\s,]+/gi) ?? [])
        const missing = referenceUrls.filter(r => !existing.has(r))
        if (missing.length > 0) raw = `${missing.join(', ')}, ${raw}`.trim()
      }
      newPrompt = raw
    } else {
      // stepNumber === 7
      const { messages, retryMessages } = buildKlingMessages(systemMessage, body, project)
      const oldPrompt = (body.currentPrompt ?? '').trim()
      newPrompt = await generateWithRetry(messages as any, oldPrompt, retryMessages as any, model)
    }

    if (!newPrompt) {
      return NextResponse.json({ error: 'Empty prompt generated' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, prompt: newPrompt })
  },
  { auth: true }
)
