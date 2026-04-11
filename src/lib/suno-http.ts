export function summarizeSunoError(body: string): string {
  const t = body.trim()
  if (
    t.startsWith('<!DOCTYPE') ||
    t.startsWith('<html') ||
    t.startsWith('<HTML')
  ) {
    const m = t.match(/<title>([^<]*)<\/title>/i)
    const title = m?.[1]?.trim()
    if (title?.toLowerCase().includes('suspend')) {
      return "Suno's API returned a suspended service page. Check SUNO_API_BASE_URL and your provider."
    }
    return title
      ? `Suno returned "${title}". Verify SUNO_API_BASE_URL and API key.`
      : 'Suno returned an HTML error page instead of JSON.'
  }
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(t) as { message?: string; error?: string }
      if (typeof j.message === 'string' && j.message.trim()) return j.message
      if (typeof j.error === 'string' && j.error.trim()) return j.error
    } catch {
      /* not valid JSON */
    }
  }
  const one = t.replace(/\s+/g, ' ')
  return one.length > 280
    ? `${one.slice(0, 280)}…`
    : one || 'Suno API request failed'
}
