const PATH_ENDS_WITH_AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)(?:\?.*)?$/i

export function normalizeSunoPlayableUrl(url: string): string {
  const t = url.trim()
  if (!/^https?:\/\//i.test(t)) return t
  try {
    const u = new URL(t)
    const host = u.hostname.toLowerCase()
    if (host !== 'musicfile.removeai.ai' && !host.endsWith('.removeai.ai'))
      return t
    const path = u.pathname
    if (PATH_ENDS_WITH_AUDIO_EXT.test(path)) return t
    if (path === '/' || path === '') return t
    const base = path.replace(/\/$/, '')
    u.pathname = `${base}.mp3`
    return u.toString()
  } catch {
    return t
  }
}

function findAudioUrl(obj: unknown, depth: number): string | null {
  if (depth > 14 || obj == null) return null
  if (typeof obj === 'string') {
    const s = obj.trim()
    if (!/^https?:\/\//i.test(s)) return null
    if (/\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i.test(s)) return s
    try {
      const u = new URL(s)
      const host = u.hostname.toLowerCase()
      if (host === 'musicfile.removeai.ai' || host.endsWith('.removeai.ai')) {
        return normalizeSunoPlayableUrl(s)
      }
    } catch {
      return null
    }
    return null
  }
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const u = findAudioUrl(x, depth + 1)
      if (u) return u
    }
    return null
  }
  if (typeof obj === 'object') {
    const o = obj as Record<string, unknown>
    for (const key of Object.keys(o)) {
      const lower = key.toLowerCase()
      if (
        (lower.includes('audio') && lower.includes('url')) ||
        lower === 'audiourl' ||
        lower === 'audio_url'
      ) {
        const v = o[key]
        if (typeof v === 'string' && v.startsWith('http'))
          return normalizeSunoPlayableUrl(v)
      }
    }
    for (const v of Object.values(o)) {
      const u = findAudioUrl(v, depth + 1)
      if (u) return u
    }
  }
  return null
}

function jsonStringUpper(obj: unknown): string {
  try {
    return JSON.stringify(obj).toUpperCase()
  } catch {
    return ''
  }
}

export function extractSunoTaskId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (typeof o.taskId === 'string' && o.taskId.trim()) return o.taskId.trim()
  for (const key of ['data', 'result'] as const) {
    const inner = o[key]
    if (inner && typeof inner === 'object') {
      const tid = (inner as Record<string, unknown>).taskId
      if (typeof tid === 'string' && tid.trim()) return tid.trim()
    }
  }
  return null
}

export type SunoPollState = 'pending' | 'complete' | 'failed'

function pickRecordPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const inner = o.data
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>
  }
  return o
}

function failureDetailFromRecord(rec: Record<string, unknown>): string {
  const msg =
    (typeof rec.errorMessage === 'string' && rec.errorMessage.trim()) ||
    (typeof rec.error_message === 'string' && rec.error_message.trim()) ||
    (typeof rec.message === 'string' && rec.message.trim()) ||
    ''
  const code = rec.errorCode
  const codeBit =
    typeof code === 'number' && !msg.includes(String(code))
      ? ` (error ${code})`
      : ''
  return (msg || 'Generation failed') + codeBit
}

function pickPlayableUrlFromTrack(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
  const o = entry as Record<string, unknown>
  const candidates = [
    o.audioUrl,
    o.streamAudioUrl,
    o.sourceAudioUrl,
    o.sourceStreamAudioUrl,
  ]
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim()
      if (t.startsWith('http')) return t
    }
  }
  return null
}

function sunoDataFromRecord(rec: Record<string, unknown>): unknown[] | null {
  const r = rec.response
  if (r && typeof r === 'object' && !Array.isArray(r)) {
    const sd = (r as Record<string, unknown>).sunoData
    if (Array.isArray(sd)) return sd
  }
  const sdTop = rec.sunoData
  if (Array.isArray(sdTop)) return sdTop
  return null
}

export function extractSunoTrackPlayableUrls(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []

  const tryRec = (rec: Record<string, unknown>): string[] => {
    const arr = sunoDataFromRecord(rec)
    if (!arr) return []
    const out: string[] = []
    for (const item of arr) {
      const u = pickPlayableUrlFromTrack(item)
      if (u) out.push(u)
    }
    return out
  }

  const root = raw as Record<string, unknown>
  let urls = tryRec(root)
  if (urls.length > 0) return urls.map(normalizeSunoPlayableUrl)

  const data = root.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    urls = tryRec(data as Record<string, unknown>)
    if (urls.length > 0) return urls.map(normalizeSunoPlayableUrl)
  }

  return []
}

export function parseSunoRecordInfo(raw: unknown): {
  state: SunoPollState
  audioUrl: string | null
  audioUrls: string[]
  detail?: string
} {
  const emptyFail = {
    state: 'failed' as const,
    audioUrl: null as string | null,
    audioUrls: [] as string[],
  }

  const root =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null
  if (root && typeof root.code === 'number' && root.code !== 200) {
    const msg =
      typeof root.msg === 'string' && root.msg.trim()
        ? root.msg.trim()
        : 'Request failed'
    return { ...emptyFail, detail: msg }
  }

  const rec = pickRecordPayload(raw)
  if (rec) {
    const status =
      typeof rec.status === 'string' ? rec.status.trim().toUpperCase() : ''
    if (
      status &&
      (status.includes('FAIL') ||
        status.includes('ERROR') ||
        status === 'CANCELLED')
    ) {
      return {
        state: 'failed',
        audioUrl: null,
        audioUrls: [],
        detail: failureDetailFromRecord(rec),
      }
    }
  }

  const flat = jsonStringUpper(raw)
  if (
    flat.includes('"STATUS":"FAILED"') ||
    flat.includes('"STATUS": "FAILED"') ||
    flat.includes('GENERATION_FAILED') ||
    flat.includes('GENERATE_AUDIO_FAILED') ||
    flat.includes('"CODE":400') ||
    flat.includes('"CODE": 400')
  ) {
    if (rec) {
      return {
        state: 'failed',
        audioUrl: null,
        audioUrls: [],
        detail: failureDetailFromRecord(rec),
      }
    }
    return {
      state: 'failed',
      audioUrl: null,
      audioUrls: [],
      detail: 'Generation failed',
    }
  }

  const trackUrls = extractSunoTrackPlayableUrls(raw)
  if (trackUrls.length > 0) {
    return {
      state: 'complete',
      audioUrl: trackUrls[0],
      audioUrls: trackUrls,
    }
  }

  const legacyAudio = findAudioUrl(raw, 0)
  if (legacyAudio) {
    return {
      state: 'complete',
      audioUrl: legacyAudio,
      audioUrls: [legacyAudio],
    }
  }

  if (
    flat.includes('SUCCESS') ||
    flat.includes('COMPLETE') ||
    flat.includes('FINISHED') ||
    flat.includes('SUCCEEDED')
  ) {
    return { state: 'pending', audioUrl: null, audioUrls: [] }
  }

  return { state: 'pending', audioUrl: null, audioUrls: [] }
}
