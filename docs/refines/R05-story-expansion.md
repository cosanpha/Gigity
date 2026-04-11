# R05 — Step 2: Lyrics-Driven 10-20 Scene Expansion

## What this builds

Step 2 (Story Script) currently generates 3-5 generic scenes. Users need 10-20 scenes,
each mapped to 1-2 lines of lyrics from Step 3 — because that's how they actually build
videos: one scene per lyric line, one clip per scene.

The lyrics are the spine. The scenes hang off them.

## Why

The current prompt produces a short script disconnected from the music. In practice,
the user writes song lyrics first (step 3), then generates scene images per lyric line
(step 7), then animates each image (step 8). 3-5 scenes covers ~10 seconds of a
30-60 second video. That's not a video, it's a teaser.

## Files to change

```
src/lib/workflow-templates.ts     ← update step 2 and step 3 promptTemplates
```

No new files, no new components. Just better prompts.

---

## Step 1 — Update step 2 prompt (Story Script)

The new prompt generates 10-20 scenes, each with:
- A lyric anchor (1-2 lines the scene illustrates)
- Visual description (what the camera sees)
- On-screen text or caption if any
- Mood note

```ts
// src/lib/workflow-templates.ts — replace stepNumber 2 promptTemplate
{
  stepNumber: 2,
  title: 'Story Script',
  tool: 'Gigity',
  type: 'llm',
  promptTemplate: `Write a detailed scene-by-scene story script for a 30–60 second short-form video ad.

Campaign brief:
{{step_1_output}}

Brand: {{brand_name}}
Tone: {{tone}}
Target audience: {{target_audience}}

You will also write song lyrics in the next step. Write 10-20 scenes so that each scene
can be mapped to 1-2 lines of lyrics. Think of this as storyboarding to music: the lyrics
will drive the visuals.

For each scene:
1. Scene number and short title (e.g. "Scene 4 — The Discovery")
2. Lyric anchor: write 1-2 placeholder lyric lines that this scene should illustrate
   (these will be refined in Step 3, but anchor them now for continuity)
3. Visuals: what the camera sees — setting, character action, expressions, props
4. On-screen text (optional): any caption or text overlay
5. Mood: one word (e.g. "hopeful", "tense", "playful")

Format:

**Scene [N] — [short title]**
Lyric: "[1-2 lyric lines]"
Visuals: [what we see]
Text: [caption or "none"]
Mood: [one word]

Rules:
- Characters should feel like real people, not stock photo types
- Every scene earns its place — no filler
- The first scene is the hook (stops the scroll in 2 seconds)
- The last scene is the CTA or emotional payoff
- Total running time: 30–60 seconds at ~2–4 seconds per scene`,
},
```

---

## Step 2 — Update step 3 prompt (Song Lyrics) to follow step 2 scenes

Step 3 now reads the scene list and writes lyrics that match each lyric anchor from step 2.
This creates a closed loop: scene → lyric → scene image → animation.

```ts
// src/lib/workflow-templates.ts — replace stepNumber 3 promptTemplate
{
  stepNumber: 3,
  title: 'Song Lyrics',
  tool: 'SunoAI',
  type: 'llm',
  promptTemplate: `Write song lyrics for a 30–60 second {{brand_name}} ad.

Based on this story script:
{{step_2_output}}

Brand tone: {{tone}}
Target audience: {{target_audience}}

The story has 10-20 scenes, each with a lyric anchor. Write the full lyrics so that
each 1-2 lines correspond to one scene in order. Label each section so it's clear
which lyrics map to which scenes.

Format your output as SunoAI expects, but annotate each section:

[Verse 1] (Scenes 1-4)
(lyrics — 1-2 lines per scene)

[Chorus] (Scenes 5-7)
(lyrics)

[Verse 2] (Scenes 8-12)
(lyrics)

[Chorus] (Scenes 13-15)
(lyrics)

[Bridge / Outro] (Scenes 16-20, optional)
(lyrics)

Rules:
- Each 1-2 lines = one scene from the story. Keep them in order.
- The chorus is the emotional peak — the most memorable moment
- Rhyme scheme that feels natural, not forced
- Avoid {{brand_name}} overuse — mention once or twice max
- Vocabulary and cultural references for: {{target_audience}}
- Total length: 30–60 seconds when sung at moderate tempo`,
},
```

---

## Step 3 — Update step 7 prompt to reference per-scene lyric lines

With 10-20 scenes, step 7 (Scene Image Prompts) now generates one Midjourney prompt
per scene and explicitly references the matching lyric line as context.

```ts
// src/lib/workflow-templates.ts — replace stepNumber 7 promptTemplate
{
  stepNumber: 7,
  title: 'Scene Image Prompts',
  tool: 'Midjourney',
  type: 'llm',
  promptTemplate: `Write Midjourney image generation prompts for every scene in the story.

Story script (10-20 scenes):
{{step_2_output}}

Song lyrics:
{{step_3_output}}

Character image references (paste Cloudinary URLs for character consistency):
{{step_6_output}}

For each scene:
1. Scene number and short title (from Step 2)
2. Lyric line(s) the scene illustrates
3. Midjourney prompt

Format:

**Scene [N] — [short title]**
Lyric: "[matching lyric line]"
Prompt: [character ref URL if applicable], [scene description], [setting], [lighting], [camera angle], [mood], cinematic --ar 9:16

Rules:
- Use --ar 9:16 (portrait) for all scenes — TikTok / Reels format
- Reference character URLs from Step 6 for visual consistency across scenes
- Lighting and color grade should stay consistent across all scenes
- Be specific: "golden hour backlighting" beats "good lighting"
- One prompt per scene — every scene gets an image`,
},
```

Note the change from `--ar 16:9` to `--ar 9:16`. Portrait ratio matches TikTok/Reels.

---

## Verify

1. Generate step 1 → step 2 → should see 10-20 scenes, each with lyric anchor
2. Generate step 3 → lyrics labeled by scene range (Scenes 1-4, etc.)
3. Generate step 7 → one prompt per scene, all use `--ar 9:16`
4. Scene count in step 2 and prompt count in step 7 should match

---

**Output:** Story scripts go from 3-5 scenes to 10-20 lyrics-anchored scenes.
Scene images match portrait ratio. Everything feeds forward: brief → scene → lyric → image → clip.

**Next step:** [R06-step4-music.md](R06-step4-music.md) — Step 4 music split + SunoAI dual mode
