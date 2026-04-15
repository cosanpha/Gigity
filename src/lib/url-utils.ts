// ─── HTTP URL validation ───────────────────────────────────────────────────

export function isHttpOrHttpsUrl(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (!u.hostname) return false
    return true
  } catch {
    return false
  }
}

export function pastedTextHasOnlyHttpUrls(text: string): boolean {
  const lines = text.split(/\n/)
  for (const line of lines) {
    const t = line.trim()
    if (t === '') continue
    if (!isHttpOrHttpsUrl(t)) return false
  }
  return true
}

// ─── URL extraction from prompt text ──────────────────────────────────────

export function sanitizeHttpUrlFromChunk(raw: string): string | null {
  let t = raw.trim()
  while (t.length > 0) {
    const last = t[t.length - 1]
    if (
      last === ')' ||
      last === ']' ||
      last === '}' ||
      last === '"' ||
      last === "'" ||
      last === '>' ||
      last === ','
    ) {
      t = t.slice(0, -1)
      continue
    }
    break
  }
  if (!t) return null
  try {
    const u = new URL(t)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.href
  } catch {
    return null
  }
}

export function extractHttpUrlsFromPromptText(text: string): string[] {
  const chunks = text.match(/https?:\/\/\S+/g) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const chunk of chunks) {
    const href = sanitizeHttpUrlFromChunk(chunk)
    if (href && !seen.has(href)) {
      seen.add(href)
      out.push(href)
    }
  }
  return out
}

// ─── Video URL detection ──────────────────────────────────────────────────

/** Client-side check: URL looks like a video resource (file extension or Cloudinary video delivery). */
export function isProbablyVideoHttpUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (
      u.hostname === 'res.cloudinary.com' &&
      (u.pathname.includes('/video/upload/') ||
        u.pathname.includes('/video/fetch/'))
    ) {
      return true
    }
    const pathAndQuery = `${u.pathname}${u.search}`.toLowerCase()
    if (/\.(mp4|webm|mov|m4v|mkv|mpeg|mpg|ogv)(\?|#|&|$)/i.test(pathAndQuery)) {
      return true
    }
    if (
      /[?&]format=(mp4|webm|mov|m4v)(\?|&|$)/i.test(u.search) ||
      /[?&]type=video/i.test(u.search)
    ) {
      return true
    }
    return false
  } catch {
    return false
  }
}
