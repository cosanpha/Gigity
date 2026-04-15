export type AIModelTokenPricing = {
  name: string
  inputUsdPer1M: number
  cachedInputUsdPer1M: number | null
  outputUsdPer1M: number
}

/** Only models actively used in the workflow. Add entries here when switching models. */
export const AI_MODELS: Record<string, AIModelTokenPricing> = {
  'gpt-4.1': {
    name: 'gpt-4.1',
    inputUsdPer1M: 2.0,
    cachedInputUsdPer1M: 0.5,
    outputUsdPer1M: 8.0,
  },
  'gpt-4.1-mini': {
    name: 'gpt-4.1-mini',
    inputUsdPer1M: 0.4,
    cachedInputUsdPer1M: 0.1,
    outputUsdPer1M: 1.6,
  },
}
