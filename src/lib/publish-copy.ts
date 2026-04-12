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
