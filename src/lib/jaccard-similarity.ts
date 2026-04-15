function normalizeForSimilarity(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function jaccardSimilarity(a: string, b: string): number {
  const sa = new Set(normalizeForSimilarity(a))
  const sb = new Set(normalizeForSimilarity(b))
  if (sa.size === 0 && sb.size === 0) return 1
  const intersection = [...sa].filter(x => sb.has(x)).length
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 0 : intersection / union
}
