import { llmModelSuggestTitle } from '@/constants/workflow-llm-models'
import { apiHandler } from '@/lib/api-handler'
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

export const POST = apiHandler(
  async (req: Request) => {
    const body = await req.json()
    const brandProfileId = body.brandProfileId
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
    const brandLinksStr =
      brand.brandLinks?.length > 0 ? brand.brandLinks.join(', ') : 'None listed'

    const userBlock = [
      `Brand name: ${brand.name}`,
      `Product / description: ${brand.description}`,
      `Target audience: ${brand.targetAudience || 'Not specified'}`,
      `Tone: ${brand.tone || 'Not specified'}`,
      `Platforms: ${platformStr}`,
      `Brand links (website, app stores, etc.): ${brandLinksStr}`,
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
- Roughly 3-10 words, under 90 characters.
- Concrete beats vague (e.g. a moment, season, offer, emotion, or scene - tied to the brand).`,
      },
      { role: 'user' as const, content: userBlock },
    ]

    let raw: string
    try {
      raw = await callLLM(messages, { model: llmModelSuggestTitle() })
    } catch {
      return NextResponse.json(
        {
          error: 'Could not generate a title - try again or type one manually',
        },
        { status: 502 }
      )
    }

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
  },
  { auth: true }
)
