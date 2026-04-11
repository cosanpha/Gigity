import { SUNO_API_KEY } from '@/constants/env.server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!SUNO_API_KEY) {
    return NextResponse.json(
      { error: 'SunoAI API key not configured' },
      { status: 501 }
    )
  }

  const { lyrics, stylePrompt } = await req.json()

  if (!lyrics?.trim() || !stylePrompt?.trim()) {
    return NextResponse.json(
      { error: 'lyrics and stylePrompt are required' },
      { status: 400 }
    )
  }

  const res = await fetch('https://studio-api.suno.ai/api/generate/v2/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: lyrics,
      tags: stylePrompt,
      mv: 'chirp-v3-5',
      make_instrumental: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `SunoAI error: ${err}` }, { status: 502 })
  }

  const data = await res.json()
  const url = data?.clips?.[0]?.audio_url ?? data?.audio_url
  if (!url) {
    return NextResponse.json(
      { error: 'No audio URL in SunoAI response' },
      { status: 502 }
    )
  }

  return NextResponse.json({ url })
}
