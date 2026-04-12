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
