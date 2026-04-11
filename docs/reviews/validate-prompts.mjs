#!/usr/bin/env node
/**
 * Prompt Validation Script — Gigity
 *
 * Runs all 7 LLM prompts against the Deewas test context in order,
 * chains outputs between steps, and saves results to docs/validation-outputs.md
 *
 * Usage:
 *   node docs/validate-prompts.mjs
 *
 * Requirements:
 *   - OPENAI_API_KEY set in .env or environment
 *   - Node 18+
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

// --- Load .env ---
function loadEnv() {
  const envPath = path.join(rootDir, '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not set. Add it to .env')
  process.exit(1)
}

// --- Deewas test context ---
const DEEWAS = {
  brand_name: 'Deewas',
  brand_description:
    'Personal financial management app with AI budgeting. Helps young adults track spending, set savings goals, and understand where their money goes each month.',
  target_audience:
    'Young adults 22–32 managing their first salary, want to feel in control of money without being overwhelmed',
  tone: 'Warm, Encouraging, Modern',
  platform: 'TikTok, YouTube Shorts, Instagram Reels',
  example_videos: '(none)',
}

// --- Call OpenAI ---
async function callLLM(userPrompt) {
  const body = {
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `You are a creative AI assistant helping produce a short-form video ad for ${DEEWAS.brand_name}.\n\nBrand: ${DEEWAS.brand_name}\nDescription: ${DEEWAS.brand_description}\nTarget audience: ${DEEWAS.target_audience}\nTone: ${DEEWAS.tone}\nPlatforms: ${DEEWAS.platform}`,
      },
      { role: 'user', content: userPrompt },
    ],
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${data.error?.message}`)
  }

  return data.choices[0].message.content
}

// --- Prompt templates (from workflow-templates.ts) ---
const PROMPTS = {
  step1: ({
    brand_name,
    brand_description,
    target_audience,
    tone,
    platform,
    example_videos,
  }) =>
    `
You are a creative strategist for ${brand_name}.

Product: ${brand_description}
Target audience: ${target_audience}
Brand tone: ${tone}
Publishing platforms: ${platform}
Reference videos (style examples): ${example_videos}

Write a campaign brief for a short-form video ad. Include:
1. Campaign concept (1-2 sentences — the core idea)
2. Hook (the first 3 seconds — what stops the scroll)
3. Emotional arc (what the viewer feels: start → middle → end)
4. Call to action
5. Key message (one sentence the viewer should remember)

Be specific to ${brand_name}. Do not write a generic brief.`.trim(),

  step2: ({ step_1_output }) =>
    `
Write a story script for a 30–60 second short-form video ad based on this campaign brief:

${step_1_output}

Format:
- Scene-by-scene breakdown (3-5 scenes)
- Each scene: what we see, what happens, any voiceover or on-screen text
- Characters should feel like real people, not stock photo people
- Dialogue or narration should feel natural, not salesy

Keep it tight. Every second counts.`.trim(),

  step3: ({ brand_name, tone, target_audience, step_2_output }) =>
    `
Write song lyrics for a 30–60 second ${brand_name} ad.

Based on this story:
${step_2_output}

Brand tone: ${tone}

Format your output as SunoAI expects:
[Verse]
(lyrics)

[Chorus]
(lyrics)

[Bridge] (optional)
(lyrics)

Rules:
- Rhyme scheme that feels natural, not forced
- The chorus should be the emotional peak of the story
- Avoid product name overuse — mention ${brand_name} once or twice max
- Write lyrics that resonate with ${target_audience}`.trim(),

  step4: ({ brand_name, tone, target_audience, step_3_output }) =>
    `
Write a SunoAI music generation prompt for a ${brand_name} ad.

Brand tone: ${tone}
Lyrics:
${step_3_output}

Write the prompt as a comma-separated list of musical descriptors:
genre, tempo, mood, instruments, vocal style, energy level.
Example: "upbeat pop, 120 BPM, warm acoustic guitar, female vocals, hopeful, building energy"

Then write a short style note (1-2 sentences) explaining what feeling the music should
create for a viewer who is ${target_audience}.`.trim(),

  step5: ({ step_2_output }) =>
    `
Based on this story script, identify all on-screen characters and write
Midjourney image prompts for each one.

Story script:
${step_2_output}

For each character:
1. Name and role in the story (1 sentence)
2. Visual description (age, ethnicity, style, expression, body language)
3. Midjourney prompt

Format:
**Character — [Name] ([role])**
Description: ...
Midjourney prompt: Portrait of [description], soft studio lighting, clean background --ar 1:1 --style raw

Be specific: "Vietnamese woman, 26, office casual, warm smile" beats "young professional woman".`.trim(),

  step7: ({ step_2_output, step_6_output }) =>
    `
Write Midjourney image generation prompts for each scene in the story.

Story script:
${step_2_output}

Character image references (use to maintain visual consistency):
${step_6_output}

For each scene:
1. Scene number and short title
2. Midjourney prompt — include character references, setting, lighting, camera angle, mood

Format:
**Scene [N] — [short title]**
Prompt: [character ref URL if applicable], [scene description], [lighting], [camera], [mood], cinematic --ar 16:9

Generate one prompt per scene. All scenes should look like they belong to the same video.`.trim(),

  step8: ({ step_2_output, step_7_output }) =>
    `
Write KlingAI video generation prompts for each scene.

Story script:
${step_2_output}

Scene image prompts:
${step_7_output}

For each scene, write a KlingAI prompt that animates it:
- Start from the scene image
- Describe camera motion and character movement
- Describe mood and pacing
- Keep each clip 3–8 seconds

Format:
**Scene [N] — [short title]**
KlingAI prompt: [description of motion, camera, character action, duration]

Tip: simple, clear movement descriptions work best in KlingAI.`.trim(),
}

// --- Validation criteria ---
function evaluate(stepNum, output) {
  const checks = {
    isDeewasSpecific:
      output.toLowerCase().includes('deewas') ||
      output.toLowerCase().includes('budget') ||
      output.toLowerCase().includes('spending') ||
      output.toLowerCase().includes('financial'),
    hasProperFormat: output.includes('\n'),
    notTooShort: output.length > 200,
    notBloated: output.length < 4000,
  }

  const stepSpecific = {
    1: () =>
      ['concept', 'hook', 'arc', 'action', 'message'].filter(w =>
        output.toLowerCase().includes(w)
      ).length >= 3,
    2: () =>
      output.toLowerCase().includes('scene') &&
      output.toLowerCase().split('scene').length >= 3,
    3: () => output.includes('[Verse]') || output.includes('[verse]'),
    4: () =>
      output.includes('BPM') ||
      output.includes('bpm') ||
      output.toLowerCase().includes('tempo'),
    5: () =>
      output.toLowerCase().includes('midjourney') || output.includes('--ar'),
    7: () =>
      output.includes('**Scene') || output.toLowerCase().includes('scene 1'),
    8: () =>
      output.toLowerCase().includes('klingai') ||
      (output.toLowerCase().includes('scene') &&
        output.toLowerCase().includes('camera')),
  }

  const stepCheck = stepSpecific[stepNum] ? stepSpecific[stepNum]() : true

  return {
    ...checks,
    hasRequiredElements: stepCheck,
    passed: Object.values(checks).every(Boolean) && stepCheck,
  }
}

// --- Main ---
async function main() {
  console.info('🚀 Gigity Prompt Validation — Deewas Context\n')

  const outputs = {}
  const results = []

  // Placeholder for step 6 (manual step)
  const STEP6_PLACEHOLDER = `https://example.com/char1.png (Placeholder — run step 6 manually in Midjourney)
https://example.com/char2.png`

  const steps = [
    { num: 1, label: 'Campaign Brief', fn: () => PROMPTS.step1(DEEWAS) },
    {
      num: 2,
      label: 'Story Script',
      fn: () => PROMPTS.step2({ step_1_output: outputs[1] }),
    },
    {
      num: 3,
      label: 'Song Lyrics',
      fn: () => PROMPTS.step3({ ...DEEWAS, step_2_output: outputs[2] }),
    },
    {
      num: 4,
      label: 'Music Prompt',
      fn: () => PROMPTS.step4({ ...DEEWAS, step_3_output: outputs[3] }),
    },
    {
      num: 5,
      label: 'Character Image Prompts',
      fn: () => PROMPTS.step5({ step_2_output: outputs[2] }),
    },
    {
      num: 7,
      label: 'Scene Image Prompts',
      fn: () =>
        PROMPTS.step7({
          step_2_output: outputs[2],
          step_6_output: STEP6_PLACEHOLDER,
        }),
    },
    {
      num: 8,
      label: 'KlingAI Animation Prompts',
      fn: () =>
        PROMPTS.step8({ step_2_output: outputs[2], step_7_output: outputs[7] }),
    },
  ]

  for (const step of steps) {
    process.stdout.write(`Testing Step ${step.num} — ${step.label}... `)
    try {
      const prompt = step.fn()
      const output = await callLLM(prompt)
      outputs[step.num] = output
      const eval_ = evaluate(step.num, output)
      const status = eval_.passed ? '✅ PASS' : '⚠️  NEEDS REVIEW'
      console.info(status)
      results.push({
        num: step.num,
        label: step.label,
        output,
        eval: eval_,
        status: eval_.passed ? 'validated' : 'needs_revision',
      })
    } catch (err) {
      console.info(`❌ ERROR: ${err.message}`)
      results.push({
        num: step.num,
        label: step.label,
        output: null,
        eval: null,
        status: 'error',
        error: err.message,
      })
    }
  }

  // --- Write output report ---
  const reportPath = path.join(__dirname, 'validation-outputs.md')
  let report = `# Prompt Validation Outputs — Deewas Context\n\nGenerated: ${new Date().toISOString()}\n\n`

  for (const r of results) {
    report += `---\n\n## Step ${r.num} — ${r.label}\n\n`
    if (r.error) {
      report += `**Status:** ❌ ERROR\n\n\`\`\`\n${r.error}\n\`\`\`\n\n`
    } else {
      const checks = r.eval
      report += `**Status:** ${checks.passed ? '✅ Validated' : '⚠️ Needs Revision'}\n\n`
      report += `**Checks:**\n`
      report += `- Deewas-specific: ${checks.isDeewasSpecific ? '✅' : '❌'}\n`
      report += `- Has proper format: ${checks.hasProperFormat ? '✅' : '❌'}\n`
      report += `- Not too short: ${checks.notTooShort ? '✅' : '❌'}\n`
      report += `- Not bloated: ${checks.notBloated ? '✅' : '❌'}\n`
      report += `- Has required elements: ${checks.hasRequiredElements ? '✅' : '❌'}\n\n`
      report += `**Output:**\n\n${r.output}\n\n`
    }
  }

  fs.writeFileSync(reportPath, report)
  console.info(`\n📄 Report saved to docs/validation-outputs.md`)

  // --- Summary ---
  const passed = results.filter(r => r.status === 'validated').length
  const failed = results.filter(r => r.status === 'needs_revision').length
  const errors = results.filter(r => r.status === 'error').length
  console.info(
    `\nSummary: ${passed} passed / ${failed} needs review / ${errors} errors`
  )
  console.info(
    `\nNext: review docs/validation-outputs.md and update workflow-templates.ts if needed.`
  )
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
