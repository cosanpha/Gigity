# 03b — Workflow Engine: Step Definitions

## What this builds

The `workflow-templates.ts` file: 11 step definitions with types, titles, tools,
and placeholder prompt templates. The 7 LLM prompts here are **drafts** — they get
validated manually before M2 goes live (see [05-prompt-validation.md](05-prompt-validation.md)).

## Prerequisites

[03a-video-project-model.md](03a-video-project-model.md) — step types are used there.

## Files to create

```
src/lib/workflow-templates.ts
```

---

## `src/lib/workflow-templates.ts`

```ts
export type StepType = 'llm' | 'external_instruction'

export interface StepDefinition {
  stepNumber: number
  title: string
  tool: string
  type: StepType
  promptTemplate?: string       // LLM steps only
  instruction?: string          // external steps only
  externalLink?: string         // external steps only
  expiryWarning?: string        // external steps: shown if asset URLs expire
}

export const WORKFLOW_STEPS: StepDefinition[] = [
  {
    stepNumber: 1,
    title: 'Campaign Brief',
    tool: 'Gigity',
    type: 'llm',
    promptTemplate: `You are a creative strategist for {{brand_name}}.

Product: {{brand_description}}
Target audience: {{target_audience}}
Brand tone: {{tone}}
Publishing platforms: {{platform}}
Reference videos (style examples): {{example_videos}}

Write a campaign brief for a short-form video ad. Include:
1. Campaign concept (1-2 sentences — the core idea)
2. Hook (the first 3 seconds — what stops the scroll)
3. Emotional arc (what the viewer feels: start → middle → end)
4. Call to action
5. Key message (one sentence the viewer should remember)

Be specific to {{brand_name}}. Do not write a generic brief.`,
  },
  {
    stepNumber: 2,
    title: 'Story Script',
    tool: 'Gigity',
    type: 'llm',
    promptTemplate: `Write a story script for a 30–60 second short-form video ad based on this campaign brief:

{{step_1_output}}

Format:
- Scene-by-scene breakdown (3-5 scenes)
- Each scene: what we see, what happens, any voiceover or on-screen text
- Characters should feel like real people, not stock photo people
- Dialogue or narration should feel natural, not salesy

Keep it tight. Every second counts.`,
  },
  {
    stepNumber: 3,
    title: 'Song Lyrics',
    tool: 'SunoAI',
    type: 'llm',
    promptTemplate: `Write song lyrics for a 30–60 second {{brand_name}} ad.

Based on this story:
{{step_2_output}}

Brand tone: {{tone}}

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
- Avoid product name overuse — mention {{brand_name}} once or twice max
- Write in the language of {{target_audience}}`,
  },
  {
    stepNumber: 4,
    title: 'Music Prompt',
    tool: 'SunoAI',
    type: 'llm',
    promptTemplate: `Write a SunoAI music generation prompt for a {{brand_name}} ad.

Brand tone: {{tone}}
Lyrics:
{{step_3_output}}

Write the prompt as a comma-separated list of musical descriptors:
genre, tempo, mood, instruments, vocal style, energy level.
Example: "upbeat pop, 120 BPM, warm acoustic guitar, female vocals, hopeful, building energy"

Then write a short style note (1-2 sentences) explaining what feeling the music should
create for a {{target_audience}} viewer.`,
  },
  {
    stepNumber: 5,
    title: 'Character Image Prompts',
    tool: 'Midjourney',
    type: 'llm',
    promptTemplate: `Based on this story script, identify all on-screen characters and write
Midjourney image prompts for each one.

Story script:
{{step_2_output}}

For each character:
1. Name and role in the story (1 sentence)
2. Visual description (age, ethnicity, style, expression, body language)
3. Midjourney prompt

Format:
**Character — [Name] ([role])**
Description: ...
Midjourney prompt: Portrait of [description], soft studio lighting, clean background --ar 1:1 --style raw

Be specific: "Vietnamese woman, 26, office casual, warm smile" beats "young professional woman".`,
  },
  {
    stepNumber: 6,
    title: 'Generate Character Images',
    tool: 'Midjourney',
    type: 'external_instruction',
    instruction: `Take the character prompts from Step 5 and generate images in Midjourney or DALL-E.

1. Open Midjourney (or DALL-E)
2. Paste each character prompt and generate
3. Copy the permanent image URLs (download and re-host if needed — see warning below)
4. Paste all URLs below, one per character`,
    externalLink: 'https://midjourney.com',
    expiryWarning:
      'Midjourney and DALL-E image URLs expire in 24–72 hours. Upload to Cloudinary, Imgur, or any permanent host before saving here.',
  },
  {
    stepNumber: 7,
    title: 'Scene Image Prompts',
    tool: 'Midjourney',
    type: 'llm',
    promptTemplate: `Write Midjourney image generation prompts for each scene in the story.

Story script:
{{step_2_output}}

Character image references (use to maintain visual consistency):
{{step_6_output}}

For each scene:
1. Scene number and short title
2. Midjourney prompt — include character references, setting, lighting, camera angle, mood

Format:
**Scene [N] — [short title]**
Prompt: [character ref URL if applicable], [scene description], [lighting], [camera], [mood], cinematic --ar 16:9

Generate one prompt per scene. All scenes should look like they belong to the same video.`,
  },
  {
    stepNumber: 8,
    title: 'KlingAI Animation Prompts',
    tool: 'KlingAI',
    type: 'llm',
    promptTemplate: `Write KlingAI video generation prompts for each scene.

Story script:
{{step_2_output}}

Scene image prompts:
{{step_7_output}}

For each scene, write a KlingAI prompt that animates it:
- Start from the scene image
- Describe camera motion and character movement
- Describe mood and pacing
- Keep each clip 3–8 seconds

Format:
**Scene [N] — [short title]**
KlingAI prompt: [description of motion, camera, character action, duration]

Tip: simple, clear movement descriptions work best in KlingAI.`,
  },
  {
    stepNumber: 9,
    title: 'Generate Video Clips',
    tool: 'KlingAI',
    type: 'external_instruction',
    instruction: `Take the KlingAI animation prompts from Step 8 and generate video clips.

1. Open KlingAI
2. For each scene: upload the scene image (from Step 7) and paste the KlingAI prompt
3. Generate and download each clip
4. Paste a link to the clips folder or the assembled video below`,
    externalLink: 'https://kling.kuaishou.com',
    expiryWarning:
      'KlingAI video URLs expire — download your clips immediately and store locally or in cloud storage.',
  },
  {
    stepNumber: 10,
    title: 'Assemble in CapCut',
    tool: 'CapCut',
    type: 'external_instruction',
    instruction: `Assemble your video in CapCut using the clips from KlingAI and the music from SunoAI.

1. Import all KlingAI video clips
2. Import the SunoAI music track
3. Arrange clips in story order
4. Sync music to scene cuts
5. Add logo, captions, on-screen text (from your story script)
6. Export at the correct aspect ratio for each platform:
   - 9:16 for TikTok / Instagram Reels
   - 16:9 for YouTube

When done, click "Mark as done" below.`,
    externalLink: 'https://www.capcut.com',
  },
  {
    stepNumber: 11,
    title: 'Publish',
    tool: 'Manual',
    type: 'external_instruction',
    instruction: `Publish your video to your platforms.

Target platforms: {{platform}}

1. Upload to each platform
2. Write captions optimized per platform (TikTok captions differ from YouTube)
3. Add relevant hashtags
4. Schedule or publish immediately

When published, click "Mark as published" below to complete this project.`,
  },
]

export function getStepDefinition(stepNumber: number): StepDefinition | undefined {
  return WORKFLOW_STEPS.find(s => s.stepNumber === stepNumber)
}
```

---

## Important: validate prompts before going live

The 7 LLM prompt templates (steps 1–5, 7–8) are drafts.
**Do not wire these into the app until each has been tested manually.**

See [05-prompt-validation.md](05-prompt-validation.md) for the test process.
This can be done in parallel while building the rest of M2.

---

## Verify

```bash
bun tsc --noEmit
```

No TypeScript errors.

---

**Output:** `WORKFLOW_STEPS` constant with all 11 step definitions and typed `StepDefinition` interface.

**Next step:** [03c-interpolate.md](03c-interpolate.md) — variable interpolation + unit tests
