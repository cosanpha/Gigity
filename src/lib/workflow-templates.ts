import { MAX_SUNO_STYLE_PROMPT_CHARS } from '@/constants/suno'

export type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
  sunoApiKeyOverride: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

export type StepStatusState = Pick<StepState, 'status'>

export type StepType = 'llm' | 'external_instruction'

export interface StepDefinition {
  stepNumber: number
  title: string
  tool: string
  type: StepType
  promptTemplate?: string // LLM steps only
  instruction?: string // external steps only
  externalLink?: string // external steps only
  expiryWarning?: string // external steps: shown if asset URLs expire
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
1. Campaign concept (1-2 sentences - the core idea)
2. Hook (the first 3 seconds - what stops the scroll)
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
    promptTemplate: `Write a plain story narrative for a 30–60 second short-form video ad.

Campaign brief:
{{step_1_output}}

Brand: {{brand_name}}
Tone: {{tone}}
Target audience: {{target_audience}}

Write 3–6 flowing paragraphs that describe what happens in the video - as if telling the story to a director. Cover the emotional journey from problem to solution to CTA. Be specific about:
- Who we see and what they're doing
- The setting and visual atmosphere in each beat
- How the emotion shifts throughout

Rules:
- No structured formatting, no lyric lines, no mood labels - just natural prose
- Characters should feel like real people, not stock photo types
- The opening beat is the hook (stops the scroll in 2 seconds)
- The closing beat is the CTA or emotional payoff
- Keep it concise - 30–60 seconds total running time`,
  },
  {
    stepNumber: 3,
    title: 'Song Lyrics',
    tool: 'SunoAI',
    type: 'llm',
    promptTemplate: `Write song lyrics for a 30–60 second {{brand_name}} ad.

Story:
{{step_2_output}}

Brand tone: {{tone}}
Target audience: {{target_audience}}

Write lyrics that follow the emotional arc of the story - from the opening problem beat through the discovery, to the confident payoff and CTA. Structure them for SunoAI:

[Verse 1]
(opening beats - problem / tension)

[Chorus]
(emotional peak - the key brand moment)

[Verse 2]
(solution / benefit beats)

[Chorus]
(repeat - drives the message home)

[Outro] (optional)
(CTA / final feeling)

Rules:
- Lyrics should mirror the story beats in order
- The chorus is the emotional peak - most memorable moment
- Rhyme scheme that feels natural, not forced
- Avoid {{brand_name}} overuse - mention once or twice max
- Vocabulary and cultural references for: {{target_audience}}
- Total length: 30–60 seconds when sung at moderate tempo`,
  },
  {
    stepNumber: 4,
    title: 'Music Prompt',
    tool: 'SunoAI',
    type: 'llm',
    promptTemplate: `Create the SunoAI music generation package for this {{brand_name}} ad.

Brand tone: {{tone}}
Target audience: {{target_audience}}
Story script: {{step_2_output}}
Lyrics:
{{step_3_output}}

Return exactly two sections:

**Lyrics**
(paste the lyrics from Step 3 here verbatim - clean formatting for SunoAI input)

**Style Prompt**
CRITICAL: Everything on the lines after **Style Prompt** until the end of your reply must be at most ${MAX_SUNO_STYLE_PROMPT_CHARS} characters total (count spaces and punctuation). Suno’s API rejects longer style text.

Rules for **Style Prompt**:
- Use ONLY a tight comma-separated list of musical descriptors (genre, BPM, instruments, vocal type, mood, energy). No bullet lists, no paragraphs, no quoted explanations.
- Target well under ${MAX_SUNO_STYLE_PROMPT_CHARS} characters so small edits still fit; aim for roughly 120–400 characters of descriptors.
- Do NOT add a separate “note” or explanation paragraph after the descriptors - fold any nuance into the comma-separated list only.

Examples (short enough for Suno):
"upbeat pop, 120 BPM, warm acoustic guitar, female vocals, hopeful, building energy"
"lo-fi hip hop, 85 BPM, mellow, soft piano, light drums, introspective"

The descriptors must still reflect:
- Brand tone: {{tone}}
- Audience: {{target_audience}}
- Story emotional arc (opening mood → chorus peak → closing mood) in compact tags only.`,
  },
  {
    stepNumber: 5,
    title: 'Character Images',
    tool: 'DALL-E',
    type: 'llm',
    promptTemplate: `Based on this story script, identify all on-screen characters and write
DALL-E image prompts for each one.

Story script:
{{step_2_output}}

For each character:
1. Name and role in the story (1 sentence)
2. Visual description (age, ethnicity, style, expression, body language)
3. DALL-E prompt

Format:
**Character - [Name] ([role])**
Description: ...
DALL-E prompt: Portrait of [description], soft studio lighting, clean background, cinematic --ar 9:16 --style raw

Be specific: "Vietnamese woman, 26, office casual, warm smile" beats "young professional woman".`,
  },
  {
    stepNumber: 6,
    title: 'Scene Images',
    tool: 'DALL-E',
    type: 'llm',
    promptTemplate: `Write DALL-E image generation prompts for a 30–60 second video.

Story:
{{step_2_output}}

Song lyrics (use to align scene beats with lyric lines):
{{step_3_output}}

Character image references (for visual consistency):
{{step_5_assets_output}}

Break the story into 10–20 distinct visual beats. For each beat write one image prompt.

Format:

**Scene [N] - [short title]**
Lyric: "[matching lyric line from Step 3]"
Prompt: [character ref URL if applicable], [scene description], [setting], [lighting], [camera angle], [mood], cinematic --ar 9:16

Rules:
- Use --ar 9:16 (portrait) for all scenes - TikTok / Reels format
- Reference character URLs from Step 5 for visual consistency across scenes
- Lighting and color grade should stay consistent across all scenes
- Be specific: "golden hour backlighting" beats "good lighting"
- One prompt per scene - every scene gets an image`,
  },
  {
    stepNumber: 7,
    title: 'KlingAI Animation Prompts',
    tool: 'KlingAI',
    type: 'llm',
    promptTemplate: `Write KlingAI video animation prompts for each scene.

Story:
{{step_2_output}}

Song lyrics:
{{step_3_output}}

Scene image prompts (one per scene):
{{step_6_output}}

Character images (Cloudinary URLs):
{{step_5_assets_output}}

For each scene from Step 6, write a KlingAI prompt that animates the scene image into a short clip.
Each clip should:
- Start from the scene image (reference by scene number)
- Describe the camera motion (pan, zoom, static, pull back, etc.)
- Describe character movement or expression change
- Match the energy and mood of the lyric line
- Run 2-5 seconds

Format:

**Scene [N] - [short title]**
Lyric: "[matching lyric line from step 3]"
Image: Scene [N] image (from Step 6)
KlingAI prompt: [subject action], [camera motion], [mood/lighting], [duration in seconds]s

Example:
**Scene 3 - The Decision**
Lyric: "She looked up and saw the light"
Image: Scene 3 image (from Step 6)
KlingAI prompt: Woman slowly lifts her gaze, camera pulls back to reveal open doorway,
warm golden light blooms in background, hopeful atmosphere, 3s

Rules:
- Keep prompts short and concrete - KlingAI works best with clear simple motions
- Avoid complex multi-character interactions - KlingAI handles single-subject better
- Camera motion should emphasize the lyric's emotional peak
- Match clip energy to BPM: slow lyrics → slower motion, energetic chorus → faster cuts
- Total sequence length: 30-60 seconds when all clips are assembled`,
  },
  {
    stepNumber: 8,
    title: 'Assemble in CapCut',
    tool: 'CapCut',
    type: 'external_instruction',
    instruction: `Assemble your video in CapCut.

All project assets are shown above. Download them before opening CapCut.

Assembly order:
1. Import all video clips (from Step 7 - KlingAI / your hosted URLs) - arrange in scene order
2. Import the music track (from Step 4)
3. Sync music to scene cuts - chorus should hit the emotional peak
4. Add logo, captions, on-screen text (from your story script, Step 2)
5. Color grade - all scenes should feel consistent
6. Export:
   - 9:16 (1080×1920) for TikTok / Instagram Reels
   - 16:9 (1920×1080) for YouTube (optional)

When done, click "Mark as done" below.`,
    externalLink: 'https://www.capcut.com',
  },
  {
    stepNumber: 9,
    title: 'Publish',
    tool: 'Manual',
    type: 'external_instruction',
    instruction: `Publish your video to your platforms.

Target platforms: {{platform}}

1. Use "Generate video description" for TikTok + YouTube copy (edit the textarea as needed).
2. Upload your video to TikTok and YouTube, then optionally paste the public URLs below and save - they are stored on this project.
3. Schedule or publish when ready.

When finished, click "Mark as published" below to complete this project.`,
  },
]

/** Total steps in the workflow (sidebar + progress UI). */
export const WORKFLOW_TOTAL_STEPS = WORKFLOW_STEPS.length

/** True when every workflow step is approved (`done`). Ignores extra array slots. */
export function isWorkflowFullyComplete(
  steps: Array<{ status: StepStatusState['status'] }>
): boolean {
  if (steps.length < WORKFLOW_TOTAL_STEPS) return false
  return steps.slice(0, WORKFLOW_TOTAL_STEPS).every(s => s.status === 'done')
}

export function getStepTitle(stepNumber: number): string {
  return WORKFLOW_STEPS.find(s => s.stepNumber === stepNumber)?.title ?? ''
}

export function getStepDefinition(
  stepNumber: number
): StepDefinition | undefined {
  return WORKFLOW_STEPS.find(s => s.stepNumber === stepNumber)
}
