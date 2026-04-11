import { connectDB } from '@/lib/db'
import { buildMessages, buildSystemMessage, callLLM } from '@/lib/llm'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const USER_PROMPT = `Write publish-ready video copy for TikTok and YouTube for the short-form ad described in your context (campaign, story, lyrics, and prior steps).

Output format - use these exact headings:

## TikTok
Caption text for the TikTok post. Open with a strong hook on the first line. Keep total length appropriate for TikTok (under 2200 characters). Include 3–6 relevant hashtags at the end.

## YouTube
Title: [single line, under 100 characters]

Description:
[2–4 short paragraphs: what the video offers, who it is for, tone matching the brand, and a clear but natural call to action. Add a line of keyword tags or hashtags at the end.]

Rules:
- Match the brand tone and platforms from the context.
- Do not use placeholders like "[insert]" or "TBD" - write final copy the creator can paste as-is.
- TikTok should feel native to short-form (direct, energetic where appropriate). YouTube title and description can be slightly more descriptive for search.`

export async function POST(_req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params

  const project = await VideoProject.findById(id).populate('brandProfileId')
  if (!project)
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const storyStep = project.steps[1]
  if (!storyStep?.llmResponse?.trim()) {
    return NextResponse.json(
      { error: 'Add a story script (step 2) before generating publish copy.' },
      { status: 400 }
    )
  }

  const brand =
    project.brandProfileId as unknown as import('@/models/BrandProfile').IBrandProfile

  const systemMessage = buildSystemMessage(brand, project.steps as any[])
  const messages = buildMessages(systemMessage, USER_PROMPT, [])

  const step9 = project.steps[8]
  if (!step9) {
    return NextResponse.json(
      { error: 'Invalid project steps' },
      { status: 500 }
    )
  }

  try {
    const response = await callLLM(messages)
    step9.llmResponse = response
    await project.save()
    return NextResponse.json({ llmResponse: response })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'LLM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

