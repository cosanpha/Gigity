/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PUBLIC_APP_URL,
  SUNO_API_BASE_URL,
  SUNO_API_KEY,
} from '@/constants/env.server'
import { MAX_SUNO_STYLE_PROMPT_CHARS } from '@/constants/suno'
import { summarizeSunoError } from '@/lib/suno-http'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!SUNO_API_BASE_URL?.trim()) {
    return NextResponse.json(
      {
        error:
          'Suno is not configured. Set SUNO_API_BASE_URL (and optionally SUNO_API_KEY or pass sunoApiKey from step 4).',
      },
      { status: 501 }
    )
  }

  const base = SUNO_API_BASE_URL.trim().replace(/\/$/, '')
  const app = PUBLIC_APP_URL.trim().replace(/\/$/, '')
  const body = await req.json()
  const { lyrics, stylePrompt, title, model, sunoApiKey } = body as {
    lyrics?: unknown
    stylePrompt?: unknown
    title?: unknown
    model?: unknown
    sunoApiKey?: unknown
  }

  const fromBody =
    typeof sunoApiKey === 'string' && sunoApiKey.trim()
      ? sunoApiKey.trim()
      : ''
  const apiKey = fromBody || SUNO_API_KEY?.trim() || ''
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Suno API key required. Set SUNO_API_KEY on the server or paste your key in step 4.',
      },
      { status: 400 }
    )
  }

  const lyricsStr = typeof lyrics === 'string' ? lyrics : ''
  const styleStr = typeof stylePrompt === 'string' ? stylePrompt : ''
  if (!lyricsStr.trim() || !styleStr.trim()) {
    return NextResponse.json(
      { error: 'lyrics and stylePrompt are required' },
      { status: 400 }
    )
  }

  const styleTrimmed = styleStr.trim()
  if (styleTrimmed.length > MAX_SUNO_STYLE_PROMPT_CHARS) {
    return NextResponse.json(
      {
        error: `Style prompt is too long (${styleTrimmed.length} characters). Shorten it to at most ${MAX_SUNO_STYLE_PROMPT_CHARS} characters for Suno.`,
      },
      { status: 400 }
    )
  }

  const callBackUrl = `${app}/api/v1/workflow/suno/callback`

  const res = await fetch(`${base}/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customMode: true,
      instrumental: false,
      model: typeof model === 'string' && model.trim() ? model.trim() : 'V4',
      prompt: lyricsStr.trim(),
      title:
        typeof title === 'string' && title.trim() ? title.trim() : undefined,
      style: styleTrimmed,
      callBackUrl,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: summarizeSunoError(text) },
      { status: 502 }
    )
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    return NextResponse.json(
      { error: 'Suno returned non-JSON body' },
      { status: 502 }
    )
  }

  const taskId = data?.taskId || data?.data?.taskId
  if (!taskId) {
    return NextResponse.json(
      { error: 'No taskId in Suno start response' },
      { status: 502 }
    )
  }

  return NextResponse.json({ taskId })
}

