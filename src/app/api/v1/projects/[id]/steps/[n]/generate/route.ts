/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDB } from '@/lib/db'
import { interpolate } from '@/lib/interpolate'
import { buildMessages, buildSystemMessage, callLLM } from '@/lib/llm'
import { getStepDefinition } from '@/lib/workflow-templates'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string; n: string }> }

export async function POST(req: Request, { params }: Ctx) {
  await connectDB()

  const { id, n } = await params
  const stepNumber = parseInt(n, 10)

  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 9) {
    return NextResponse.json({ error: 'Invalid step number' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { followUpMessage, retry } = body as {
    followUpMessage?: string
    retry?: boolean
  }

  // Load project with brand profile populated
  const project = await VideoProject.findById(id).populate('brandProfileId')
  if (!project)
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const stepDef = getStepDefinition(stepNumber)
  if (!stepDef)
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })

  if (stepDef.type === 'external_instruction') {
    return NextResponse.json(
      { error: 'External steps do not call the LLM' },
      { status: 400 }
    )
  }

  const step = project.steps[stepNumber - 1]

  // Prevent concurrent calls - UI should disable the button while generating
  if (step.status === 'generating') {
    return NextResponse.json({ error: 'Already generating' }, { status: 409 })
  }

  // Enforce step ordering: step N requires step N-1 to be done
  if (stepNumber > 1 && project.steps[stepNumber - 2].status !== 'done') {
    return NextResponse.json(
      {
        error: `Complete step ${stepNumber - 1} before generating step ${stepNumber}`,
      },
      { status: 400 }
    )
  }

  // Build interpolation context from brand + approved prior steps
  const brand = project.brandProfileId as any
  const ctx = {
    brand_name: brand.name,
    brand_description: brand.description,
    target_audience: brand.targetAudience,
    tone: brand.tone,
    platform: brand.platforms.join(', '),
    example_videos: brand.exampleVideoUrls.join(', '),
    step_1_output: getStepOutput(project.steps as any[], 1),
    step_2_output: getStepOutput(project.steps as any[], 2),
    step_3_output: getStepOutput(project.steps as any[], 3),
    step_4_output: getStepOutput(project.steps as any[], 4),
    step_5_output: getStepLlmOutput(project.steps as any[], 5),
    step_5_assets_output: getStepAssetOutput(project.steps as any[], 5),
    step_6_output: getStepOutput(project.steps as any[], 6),
    step_7_output: getStepOutput(project.steps as any[], 7),
  }

  const userPrompt = interpolate(stepDef.promptTemplate!, ctx)
  const systemMessage = buildSystemMessage(brand, project.steps as any[])

  // Retry: clear conversation history, start fresh
  if (retry) {
    step.conversation = []
    step.llmResponse = null
  }

  // Mark as generating and save (gives UI immediate feedback)
  step.status = 'generating'
  await project.save()

  try {
    const messages = buildMessages(
      systemMessage,
      userPrompt,
      step.conversation as any[],
      followUpMessage
    )

    const response = await callLLM(messages)

    // Append to conversation
    if (followUpMessage) {
      step.conversation.push({ role: 'user', content: followUpMessage })
    }
    step.conversation.push({ role: 'assistant', content: response })
    step.llmResponse = response
    step.status = 'pending' // back to pending - user must Approve to advance

    await project.save()
    return NextResponse.json({ ok: true, llmResponse: response })
  } catch (err: any) {
    // LLM call failed - reset to pending, return error
    step.status = 'pending'
    await project.save()
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

function getStepOutput(steps: any[], n: number): string {
  const s = steps[n - 1]
  if (!s || s.status !== 'done') return ''
  return s.llmResponse ?? s.outputAssetUrl ?? ''
}

function getStepLlmOutput(steps: any[], n: number): string {
  const s = steps[n - 1]
  if (!s || s.status !== 'done') return ''
  return s.llmResponse ?? ''
}

function getStepAssetOutput(steps: any[], n: number): string {
  const s = steps[n - 1]
  if (!s || s.status !== 'done') return ''
  return s.outputAssetUrl?.trim() ?? ''
}
