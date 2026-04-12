/* eslint-disable @typescript-eslint/no-explicit-any */
import { SUNO_API_BASE_URL, SUNO_API_KEY } from '@/constants/env.server'
import { requireAuth } from '@/lib/auth'
import { summarizeSunoError } from '@/lib/suno-http'
import { parseSunoRecordInfo } from '@/lib/suno-record-info'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const deny = requireAuth(req)
  if (deny) return deny
  if (!SUNO_API_BASE_URL?.trim()) {
    return NextResponse.json(
      { error: 'Suno is not configured. Set SUNO_API_BASE_URL.' },
      { status: 501 }
    )
  }

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')?.trim()
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  const headerKey = req.headers.get('x-suno-api-key')?.trim() || ''
  const apiKey = headerKey || SUNO_API_KEY?.trim() || ''
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Suno API key required. Set SUNO_API_KEY on the server or send X-Suno-Api-Key (from step 4).',
      },
      { status: 400 }
    )
  }

  const base = SUNO_API_BASE_URL.trim().replace(/\/$/, '')
  const url = `${base}/generate/record-info?taskId=${encodeURIComponent(taskId)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
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

  const parsed = parseSunoRecordInfo(data)
  return NextResponse.json({
    state: parsed.state,
    audioUrl: parsed.audioUrl,
    audioUrls: parsed.audioUrls,
    detail: parsed.detail ?? null,
  })
}
