export interface InterpolationContext {
  brand_name?: string | null
  brand_description?: string | null
  target_audience?: string | null
  tone?: string | null
  platform?: string | null
  example_videos?: string | null
  step_1_output?: string | null
  step_2_output?: string | null
  step_3_output?: string | null
  step_4_output?: string | null
  step_5_output?: string | null
  step_6_output?: string | null
  step_7_output?: string | null
  step_8_output?: string | null
}

const KNOWN_KEYS = new Set<string>([
  'brand_name', 'brand_description', 'target_audience', 'tone', 'platform',
  'example_videos', 'step_1_output', 'step_2_output', 'step_3_output',
  'step_4_output', 'step_5_output', 'step_6_output', 'step_7_output', 'step_8_output',
])

export function interpolate(template: string, ctx: InterpolationContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!KNOWN_KEYS.has(key)) return match
    const val = (ctx as Record<string, string | null | undefined>)[key]
    if (val === null || val === undefined) return ''
    return val
  })
}
