export type PublishLinks = { tiktok: string; youtube: string }

export function encodePublishLinks(
  tiktok: string,
  youtube: string
): string | null {
  const t = tiktok.trim()
  const y = youtube.trim()
  if (!t && !y) return null
  return JSON.stringify({ tiktok: t, youtube: y })
}

export function decodePublishLinks(raw: string | null): PublishLinks {
  if (!raw?.trim()) return { tiktok: '', youtube: '' }
  try {
    const o = JSON.parse(raw) as { tiktok?: string; youtube?: string }
    if (o && typeof o === 'object') {
      return {
        tiktok: typeof o.tiktok === 'string' ? o.tiktok : '',
        youtube: typeof o.youtube === 'string' ? o.youtube : '',
      }
    }
  } catch {
    // legacy: single URL stored as plain text
  }
  return { tiktok: raw.trim(), youtube: '' }
}

