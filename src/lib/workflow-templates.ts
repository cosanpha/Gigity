import { MAX_SUNO_STYLE_PROMPT_CHARS } from '@/constants/suno'

export type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  publishPlatforms: Record<string, string> | null
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
    promptTemplate: `You are the lead creative strategist for {{brand_name}}. This brief is the single source of truth: every later step (story, lyrics, music, characters, scenes, video prompts) will inherit from it. If the brief is vague, the whole ad fails-treat this like a director's one-pager, not marketing fluff.

## Inputs (use all that are non-empty; do not invent facts)
- Product / offer: {{brand_description}}
- Target audience: {{target_audience}}
- Voice & tone: {{tone}}
- Primary platforms: {{platform}} (pace, aspect ratio, and culture differ-bias hook and CTA toward how people actually behave there)
- Reference videos (steal pacing, energy, and edit rhythm-not the product): {{example_videos}}
- Where to send viewers (site, app, store, signup): {{brand_links}}

## Quality bar (non-negotiable)
- Specificity test: If you swapped "{{brand_name}}" for a random competitor and the brief still worked, rewrite until it breaks-name concrete benefits, moments, or proof, not slogans.
- No generic openers, no "in a world where," no em dashes as fake gravitas, no filler adjectives ("revolutionary," "seamless," "empowering") unless tied to a concrete claim.
- The hook must be visual or auditory in plain language (what we literally see or hear in frame 1-3), not a tagline.
- One clear viewer job: what they should think, feel, or do after 30-60 seconds.

## Output format (use these exact section headings)

### North star
One sentence: the single idea this video must prove. Not a slogan-a thesis.

### Audience tension
2-4 sentences: what belief, habit, or friction blocks them today, in their words (infer from audience + product; stay plausible).

### Campaign concept
2-3 sentences: the creative angle that resolves that tension for {{brand_name}}. Include at least one concrete scenario, object, or situation (not abstractions only).

### Hook (0-3 seconds)
Bullet list (2-3 bullets): exact attention device-visual beat, sound, text on screen, or first line of dialogue. Must feel native to {{platform}}.

### Story spine (beat outline)
Numbered list, 5-7 beats: each beat is one line (setup → tension → turn → proof or demo → emotional peak → CTA). Enough detail that a writer could script from this without guessing.

### Emotional arc
One line: start emotion → middle → end emotion (e.g. skepticism → curiosity → relief).

### Proof & credibility (if applicable)
What makes the claim believable in short-form (demo, stat, testimonial shape, before/after, social proof)-or "N/A" with one sentence why trust is not the barrier.

### Visual & sonic direction
2-4 bullets: palette, lighting, camera energy, pacing, music genre or vibe (no full lyrics). Align with reference videos when URLs exist; otherwise infer from brand + tone.

### Call to action
One sentence: the primary action, tied to {{brand_links}} when provided (e.g. "Tap link in bio," "Get the app," "Book a slot"). If links are empty, keep CTA concrete but generic.

### Key message (takeaway)
One memorable sentence the viewer should recall tomorrow-must include or clearly imply {{brand_name}}.

### Guardrails
2-4 bullets: topics, claims, or tones to avoid (legal risk, audience insult, off-brand humor, etc.).

### Success criteria
2-3 bullets: how we know this brief worked if we only watched the finished 45-second cut.`,
  },
  {
    stepNumber: 2,
    title: 'Story Script',
    tool: 'Gigity',
    type: 'llm',
    promptTemplate: `Write a plain story narrative for a 30-60 second short-form video ad.

Campaign brief:
{{step_1_output}}

Brand: {{brand_name}}
Tone: {{tone}}
Target audience: {{target_audience}}

Write 3-6 flowing paragraphs that describe what happens in the video - as if telling the story to a director. Cover the emotional journey from problem to solution to CTA. Be specific about:
- Who we see and what they're doing
- The setting and visual atmosphere in each beat
- How the emotion shifts throughout

Rules:
- No structured formatting, no lyric lines, no mood labels - just natural prose
- Characters should feel like real people, not stock photo types
- The opening beat is the hook (stops the scroll in 2 seconds)
- The closing beat is the CTA or emotional payoff
- Keep it concise - 30-60 seconds total running time`,
  },
  {
    stepNumber: 3,
    title: 'Song Lyrics',
    tool: 'SunoAI',
    type: 'llm',
    promptTemplate: `Write Suno-ready lyrics for a **short-form ad** (~**45-60 seconds** at a moderate pop / hip-hop tempo - a real **verse-chorus-verse-chorus** feel, not a one-liner jingle).

Story (hit the arc: tension → turn → payoff / CTA, but you do not need every story beat in the lyrics):
{{step_2_output}}

Brand tone: {{tone}}
Target audience: {{target_audience}}

## Length window (important)
- **Count only singable lines** (ignore section tags like [Verse 1]).
- Aim for **at least 18 lines** so the track feels like a song, and **at most 24 lines** so Suno / clip limits do not cut you off mid-word.
- **About 6-11 words per line** on average; mix shorter punchy lines with occasional slightly longer ones - avoid tiny fragments on every line.

## Structure (use these sections in order)
[Verse 1]
**4-5 lines** - one clear scene + problem or desire (from the story opening).

[Chorus]
**4 lines** - hook + emotional peak; this should be what someone hums after one listen.

[Verse 2]
**4-5 lines** - solution, benefit, or “after” moment; advance the story, do not repeat verse 1.

[Chorus]
**Same four lines as the first chorus, verbatim** - paste the identical chorus text again under this header so Suno treats it as a repeat.

[Outro] (optional)
**0-2 lines** - CTA or last hit of feeling; only if you are still ≤24 total lines.

## Rules
- Mirror the story’s emotional order (setup → lift → CTA) without narrating every paragraph of the script.
- Natural rhyme; no filler syllables just to rhyme.
- {{brand_name}}: **once or twice** max unless it is the hook.
- Vocabulary and references for: {{target_audience}}
- If you are under 18 lines, **add concrete imagery** (verbs, objects, one real moment) before you stop - do not pad with generic hype.`,
  },
  {
    stepNumber: 4,
    title: 'Song Audio',
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
- Target well under ${MAX_SUNO_STYLE_PROMPT_CHARS} characters so small edits still fit; aim for roughly 120-400 characters of descriptors.
- Do NOT add a separate “note” or explanation paragraph after the descriptors - fold any nuance into the comma-separated list only.
- **Duration / form (required):** Suno outputs for this workflow are usually **capped around ~50 seconds to ~1:15** - always fold that into the comma list with **short tags** (e.g. ~50s-1:15 length, short-form ad, tight arrangement no long intro/outro, concise song structure). Producers use this line so the model does not imply a full 3-minute epic.

Examples (short enough for Suno):
"upbeat pop, 120 BPM, ~50s-1:15 length, tight arrangement, warm acoustic guitar, female vocals, hopeful"
"lo-fi hip hop, 85 BPM, short-form ad, concise structure, mellow, soft piano, light drums, introspective"

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
    promptTemplate: `Based on this story script, identify every on-screen character and produce image-ready DALL-E prompts for each.

Purpose: these images are REFERENCE STILLS for later scenes and video - the character must read unmistakably (silhouette, face, outfit, proportions). Prioritize clarity over storytelling or action.

Story script:
{{step_2_output}}

Visual style (use for every character - repeat this look in each DALL-E line, not a mix of styles):
{{character_visual_style_instruction}}

For each character, write:

**Character - [Name] ([role])**
Description: 2-4 sentences (who they are in the story, age range, ethnicity if relevant, wardrobe, expression, posture, personality in one phrase).

Output (planning checklist - do not paste as separate lines into DALL-E; fold all of this into the single DALL-E line below):
- Ratio: vertical 9:16 portrait framing (full character visible head to toe, feet on ground or full figure in frame)
- Reference clarity: single subject only, no other people or creatures; sharp readable face and outfit; neutral or slight personality pose - not mid-action
- No interaction: character does not touch, hold, lean on, or use props, furniture, vehicles, or scene objects (wardrobe/accessories worn on the body are fine). No interacting with the environment - standing or simple stance as if on a shoot, not "in a scene"
- Background: always describe a real, simple backdrop (solid color, soft gradient, white/light studio, or minimal seamless environment). Never empty void, transparent, or "no background" - the frame needs separation and depth so the subject reads as a reference, not a cutout
- Style: pick one clear look (e.g. Pixar-style 3D cartoon, soft illustrated mascot, photoreal lifestyle, sleek 3D product render) that fits the brand story - state it explicitly
- Shot: full body, centered, balanced composition, readable silhouette, even lighting on the figure
- Lighting: soft key + gentle fill, subtle rim, or soft gradient light - even enough that facial features and clothing detail stay clear for reuse

DALL-E prompt (CRITICAL):
- Must be exactly ONE LINE after "DALL-E prompt:" - no line breaks, no bullet list on this line. The app only reads this single line for generation.
- Write one dense comma-separated prompt: lead with the character and outfit, then a simple neutral full-body stance, then explicit simple background, style, lighting, and end with "vertical 9:16 portrait" or equivalent so composition is unambiguous. Include phrases like "solo full body reference", "no props", "not touching anything", "simple studio background" as needed so the model does not add scene clutter.

Example shape (one line only):
DALL-E prompt: Friendly humanoid robot mascot, compact rounded body, blue white and green accents, large expressive eyes, warm closed-mouth smile, relaxed arms at sides, solo full body reference pose, not holding or touching anything, clean soft gray gradient studio backdrop, even soft lighting, sharp clear silhouette, Pixar-style 3D cartoon, vertical 9:16 portrait

Be specific: "Vietnamese woman, 26, linen blazer, subtle laugh, relaxed shoulders, hands empty at sides" beats "professional woman".`,
  },
  {
    stepNumber: 6,
    title: 'Scene Images',
    tool: 'DALL-E',
    type: 'llm',
    promptTemplate: `Write DALL-E image generation prompts for a 30-60 second video.

Story:
{{step_2_output}}

Song lyrics (use to align scene beats with lyric lines):
{{step_3_output}}

Character image references (for visual consistency):
{{step_5_assets_output}}

Break the story into 10-20 distinct visual beats. For each beat write one image prompt.

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
    title: 'Animated Scenes',
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

For every scene from Step 6, treat the **matching lyric line** and the **Step 6 image prompt** as one beat: motion, mood, and timing should reflect what the line *means* and what the still already shows (subject, pose, props). Do not write generic animation that could apply to any frame.

Each KlingAI line must stay one tight sentence (or two short clauses max) and include, in this order:
1. **Subject action** - what the main subject does or how expression shifts (simple, one clear motion)
2. **Camera** - pan, zoom, static, dolly, pull back, etc., chosen to support the lyric's emotional beat
3. **Background / environment** - a few words on setting behind the subject (interior vs exterior, depth, key props or architecture, sky/wall/furniture, crowd vs empty) so the clip feels anchored in the same world as the scene image - not a full paragraph, just enough to keep continuity with Step 6
4. **Mood & light** - tie to lyric + story (e.g. warm hopeful, cold tense, neon night)
5. **Duration** - 2-5s

Format:

**Scene [N] - [short title]**
Lyric: "[exact matching lyric line from Step 3 for this scene]"
Image: Scene [N] image (from Step 6)
KlingAI prompt: [subject action], [camera], [brief background/setting], [mood/lighting], [N]s

Example:
**Scene 3 - The Decision**
Lyric: "She looked up and saw the light"
Image: Scene 3 image (from Step 6)
KlingAI prompt: Woman slowly lifts her gaze toward the doorway, gentle pull back, cozy apartment hallway with soft lamp glow behind her, warm light spilling from open door ahead, hopeful quiet mood, 3s

Rules:
- Keep each KlingAI prompt short and concrete - clear simple motions beat long prose
- Lyrics and scene prompts must stay in sync: if the lyric is intimate and slow, motion stays small; if the lyric is explosive, favor punchy camera or energy (still one primary subject when possible)
- Avoid complex multi-character interactions - KlingAI handles single-subject motion better
- Camera choice should land the lyric's emotional peak in those 2-5 seconds
- Match clip energy to song feel: sparse or sad lines → slower, held frames; chorus or hype → snappier motion or stronger camera move
- Total sequence length when clips are assembled: aim for 30-60 seconds across all scenes`,
  },
  {
    stepNumber: 8,
    title: 'Video Editing',
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
