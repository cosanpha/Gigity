# 03c — Workflow Engine: interpolate.ts + Tests

## What this builds

The `interpolate()` function that fills `{{variable}}` placeholders in prompt
templates, and a complete unit test file. This is the core of the prompt engine —
a bug here poisons every LLM call.

## Prerequisites

[03b-workflow-templates.md](03b-workflow-templates.md) — templates use `{{variables}}`.

## Files to create

```
src/lib/interpolate.ts
src/lib/interpolate.test.ts
```

---

## `src/lib/interpolate.ts`

```ts
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

export function interpolate(template: string, ctx: InterpolationContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = (ctx as Record<string, string | null | undefined>)[key]
    if (val === null || val === undefined) return ''
    return val
  })
}
```

### Rules

- Known variable with a value → substitute
- Known variable with `null` or `undefined` → empty string (never output "null" or "undefined")
- Unknown `{{variable}}` not in context → **pass through unchanged** (don't throw, don't strip)

---

## `src/lib/interpolate.test.ts`

Uses Bun's built-in test runner. Run with `bun test src/lib/interpolate.test.ts`.

```ts
import { describe, expect, it } from 'bun:test'
import { interpolate } from './interpolate'

describe('interpolate', () => {

  it('substitutes all known variables', () => {
    const result = interpolate(
      'Brand: {{brand_name}}, audience: {{target_audience}}',
      { brand_name: 'Deewas', target_audience: 'Young adults' }
    )
    expect(result).toBe('Brand: Deewas, audience: Young adults')
  })

  it('replaces undefined var with empty string', () => {
    const result = interpolate('Hello {{brand_name}}', {})
    expect(result).toBe('Hello ')
    // NOT "Hello undefined"
  })

  it('replaces null var with empty string', () => {
    const result = interpolate('Hello {{brand_name}}', { brand_name: null })
    expect(result).toBe('Hello ')
    // NOT "Hello null"
  })

  it('passes unknown variable through unchanged', () => {
    const result = interpolate('Hello {{unknown_var}}', { brand_name: 'Deewas' })
    expect(result).toBe('Hello {{unknown_var}}')
    // Don't strip unknown vars — they might be intentional or a typo to debug
  })

  it('substitutes step_N_output variables', () => {
    const result = interpolate(
      'Brief:\n{{step_1_output}}\nScript:\n{{step_2_output}}',
      { step_1_output: 'Campaign brief here', step_2_output: 'Story script here' }
    )
    expect(result).toBe('Brief:\nCampaign brief here\nScript:\nStory script here')
  })

  it('replaces step output with empty string when step not yet done', () => {
    const result = interpolate('Use context: {{step_3_output}}', {
      step_3_output: undefined,
    })
    expect(result).toBe('Use context: ')
  })

  it('handles empty string value (not null)', () => {
    const result = interpolate('Tone: {{tone}}', { tone: '' })
    expect(result).toBe('Tone: ')
  })

  it('handles template with no variables', () => {
    const result = interpolate('No variables here.', { brand_name: 'Deewas' })
    expect(result).toBe('No variables here.')
  })

})
```

---

## Run tests

```bash
bun test src/lib/interpolate.test.ts
```

All 8 tests should pass. If any fail, fix `interpolate.ts` before proceeding.

---

**Output:** `interpolate()` function with 8 passing unit tests.

**Next step:** [03d-llm-builder.md](03d-llm-builder.md) — LLM message builder + callLLM
