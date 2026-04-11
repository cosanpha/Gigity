/* eslint-disable @typescript-eslint/no-explicit-any */
import { SUNO_API_BASE_URL, SUNO_API_KEY } from '@/constants/env.server'
import { summarizeSunoError } from '@/lib/suno-http'
import { parseSunoRecordInfo } from '@/lib/suno-record-info'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  if (!SUNO_API_KEY?.trim() || !SUNO_API_BASE_URL?.trim()) {
    return NextResponse.json(
      { error: 'Suno is not configured' },
      { status: 501 }
    )
  }

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')?.trim()
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  const base = SUNO_API_BASE_URL.trim().replace(/\/$/, '')
  const url = `${base}/generate/record-info?taskId=${encodeURIComponent(taskId)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SUNO_API_KEY}`,
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
