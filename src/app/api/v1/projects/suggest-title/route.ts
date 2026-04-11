import { connectDB } from '@/lib/db'
import { callLLM } from '@/lib/llm'
import BrandProfile from '@/models/BrandProfile'
import { NextResponse } from 'next/server'

function sanitizeTitle(raw: string): string {
  let t = raw.trim()
  t = t.replace(/^["'\s]+|["'\s]+$/g, '')
  const line = t.split(/\r?\n/).find(l => l.trim()) ?? ''
  t = line.trim().replace(/^(title|project name)\s*:\s*/i, '')
  if (t.length > 120) t = `${t.slice(0, 117)}...`
  return t
}

// POST /api/v1/projects/suggest-title - LLM suggests a video project title (creative topic)
export async function POST(req: Request) {
  try {
    await connectDB()

    const body = await req.json().catch(() => ({}))
    const brandProfileId = body.brandProfileId as string | undefined
    const hint =
      typeof body.hint === 'string' ? body.hint.trim().slice(0, 500) : ''

    if (!brandProfileId?.trim()) {
      return NextResponse.json(
        { error: 'brandProfileId is required' },
        { status: 400 }
      )
    }

    const brand = await BrandProfile.findById(brandProfileId).lean()
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      )
    }

    const platformStr = brand.platforms?.join(', ') || 'Not specified'
    const refs =
      brand.exampleVideoUrls?.length > 0
        ? brand.exampleVideoUrls.join(', ')
        : 'None listed'

    const userBlock = [
      `Brand name: ${brand.name}`,
      `Product / description: ${brand.description}`,
      `Target audience: ${brand.targetAudience || 'Not specified'}`,
      `Tone: ${brand.tone || 'Not specified'}`,
      `Platforms: ${platformStr}`,
      `Reference video URLs (style cues): ${refs}`,
      '',
      hint
        ? `User's creative angle or focus (use this): ${hint}`
        : 'Infer one sharp creative angle from the brand context (no generic slogans).',
      '',
      'Reply with ONLY the title line - nothing else.',
    ].join('\n')

    const messages = [
      {
        role: 'system' as const,
        content: `You name short-form ad video projects (TikTok, Reels, Shorts).

The title is the CREATIVE TOPIC for the entire pipeline: it anchors the campaign brief, story, lyrics, music mood, and visuals. It must feel specific to this brand, not interchangeable with any company.

Rules:
- Output exactly ONE line: the title text only. No quotes, bullets, labels like "Title:", or extra sentences.
- Roughly 4–14 words, under 90 characters.
- Concrete beats vague (e.g. a moment, season, offer, emotion, or scene - tied to the brand).`,
      },
      { role: 'user' as const, content: userBlock },
    ]

    const raw = await callLLM(messages)
    const title = sanitizeTitle(raw)
    if (!title) {
      return NextResponse.json(
        {
          error: 'Could not generate a title - try again or type one manually',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ title })
  } catch (error) {
    console.error('ERROR: suggest-title', error)
    const message =
      error instanceof Error ? error.message : 'Failed to suggest title'
    const isConfig = message.includes('OPENAI_API_KEY')
    return NextResponse.json(
      { error: isConfig ? 'AI is not configured on the server' : message },
      { status: isConfig ? 503 : 502 }
    )
  }
}
