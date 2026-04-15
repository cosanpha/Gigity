export type PublishLinks = Record<string, string>

export function encodePublishLinks(links: PublishLinks): string | null {
  const out: PublishLinks = {}
  for (const [platform, value] of Object.entries(links)) {
    const key = platform.trim()
    if (!key) continue
    const normalized = value.trim()
    out[key] = normalized
  }
  if (!Object.values(out).some(Boolean)) return null
  return JSON.stringify(out)
}

export function decodePublishLinks(
  raw: string | null,
  platformOrder: string[]
): PublishLinks {
  const empty: PublishLinks = {}
  for (const p of platformOrder) empty[p] = ''
  if (!raw?.trim()) return empty
  try {
    const o = JSON.parse(raw) as unknown
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const parsed = o as Record<string, unknown>
      const lowerLookup = new Map<string, string>()
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') lowerLookup.set(k.toLowerCase(), v)
      }
      for (const p of platformOrder) {
        const exact = parsed[p]
        if (typeof exact === 'string') {
          empty[p] = exact
          continue
        }
        empty[p] = lowerLookup.get(p.toLowerCase()) ?? ''
      }
      return empty
    }
  } catch {
    // legacy: single URL stored as plain text
  }
  if (platformOrder.length > 0) empty[platformOrder[0]] = raw.trim()
  return empty
}

