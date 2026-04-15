const DASH_VARIANTS_RE = /[\u2012\u2013\u2014\u2015\u2212]/g

export function normalizeNoEmDash(text: string): string {
  return text.replace(DASH_VARIANTS_RE, '-')
}

