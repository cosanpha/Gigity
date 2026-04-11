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
    // Don't strip unknown vars - they might be intentional or a typo to debug
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
