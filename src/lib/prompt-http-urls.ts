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
