// ─── Publish links (per-platform URL storage) ─────────────────────────────

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

// ─── Publish copy (LLM output parsing) ────────────────────────────────────

const DEFAULT_PLATFORMS: readonly string[] = ['TikTok', 'YouTube']

export function normalizePublishPlatforms(
  platforms: string[] | undefined | null
): string[] {
  const list = (platforms ?? []).map(p => p.trim()).filter(Boolean)
  if (list.length === 0) return [...DEFAULT_PLATFORMS]
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of list) {
    if (seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  return out
}

export function splitPublishMarkdownByHeading(
  raw: string
): Record<string, string> {
  const text = raw.trim()
  const result: Record<string, string> = {}
  if (!text) return result
  const re = /^##\s+(.+)$/gm
  const matches = [...text.matchAll(re)]
  if (matches.length === 0) return result
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim()
    const start = matches[i].index! + matches[i][0].length
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length
    const body = text.slice(start, end).replace(/^\n+/, '').replace(/\n+$/, '')
    result[title] = body
  }
  return result
}

export function joinPublishMarkdown(
  order: string[],
  blocks: Record<string, string>
): string {
  return order
    .map(name => {
      const body = (blocks[name] ?? '').trim()
      if (!body) return `## ${name}\n`
      return `## ${name}\n${body}`
    })
    .join('\n\n')
}

export function mergeParsedIntoPlatformOrder(
  parsed: Record<string, string>,
  order: string[]
): Record<string, string> {
  const lowerToBody = new Map<string, string>()
  for (const [k, v] of Object.entries(parsed)) {
    const lower = k.trim().toLowerCase()
    if (!lowerToBody.has(lower)) lowerToBody.set(lower, v)
  }
  const out: Record<string, string> = {}
  for (const p of order) {
    if (parsed[p] !== undefined) {
      out[p] = parsed[p]
      continue
    }
    const fromLower = lowerToBody.get(p.toLowerCase())
    out[p] = fromLower ?? ''
  }
  return out
}
