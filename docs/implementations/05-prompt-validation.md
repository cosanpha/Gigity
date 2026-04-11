# 05 — Prompt Validation

## What this covers

The 7 LLM prompt templates from `workflow-templates.ts` are drafts. This plan
describes how to test and validate each one manually before M2 goes live.

**Rule: no prompt goes into `workflow-templates.ts` as final until it has been tested
with real Deewas context. A prompt that produces mediocre output in the Playground
won't get better inside the app.**

## Prerequisites

[03b-workflow-templates.md](03b-workflow-templates.md) — templates must be written.
`OPENAI_API_KEY` must be set in `.env`.

## When to do this

In parallel while building M2. Do not wait until M3 is complete. You need at least
step 1 and step 2 validated before you can evaluate the full chain.

---

## Test context (Deewas)

Use these values when testing prompts manually:

```
brand_name:       Deewas
brand_description: Personal financial management app with AI budgeting.
                   Helps young adults track spending, set savings goals,
                   and understand where their money goes each month.
target_audience:  Young adults 22–32 managing their first salary, want to
                  feel in control of money without being overwhelmed
tone:             Warm, Encouraging, Modern
platform:         TikTok, YouTube Shorts, Instagram Reels
example_videos:   (leave empty or add real TikTok URLs)
```

---

## How to test a prompt

### Option A — curl

Replace `{{variables}}` with the Deewas values above, then run:

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [
      {
        "role": "system",
        "content": "You are a creative AI assistant helping produce a short-form video ad for Deewas.\n\nBrand: Deewas\nDescription: Personal financial management app with AI budgeting.\nTarget audience: Young adults 22-32 managing their first salary\nTone: Warm, Encouraging, Modern\nPlatforms: TikTok, YouTube Shorts, Instagram Reels"
      },
      {
        "role": "user",
        "content": "[PASTE INTERPOLATED PROMPT HERE]"
      }
    ]
  }'
```

### Option B — OpenAI Playground (faster for iteration)

1. Go to [platform.openai.com/playground](https://platform.openai.com/playground)
2. Select Chat mode, model `gpt-4.1-mini`
3. Paste system message in System field
4. Paste interpolated prompt in User field
5. Click Submit, read output

---

## Validation checklist — per step

For each of the 7 LLM steps (1–5, 7–8):

- [ ] Output is specific to Deewas — not generic marketing copy
- [ ] Output follows the requested format exactly
- [ ] Output length is appropriate (not too short, not bloated)
- [ ] Step N+1 prompt works with step N's output pasted in as `{{step_N_output}}`
- [ ] Output is good enough that you would use it as a starting point for a real video

If the output is mediocre: edit the prompt in `workflow-templates.ts` and re-test.
Repeat until the output is genuinely good.

---

## Step-by-step test order

Test in this order — each step feeds the next:

**Step 1 — Campaign Brief**

- Use the Deewas context above
- Expected: 5-section brief with concept, hook, arc, CTA, key message
- Quality bar: would you use this brief for a real TikTok?

**Step 2 — Story Script** (needs step 1 output)

- Paste step 1 output as `{{step_1_output}}`
- Expected: 3-5 scene breakdown, feels like real people, not stock photos
- Quality bar: could a director shoot this?

**Step 3 — Song Lyrics** (needs step 2 output)

- Expected: SunoAI-formatted [Verse]/[Chorus], rhymes don't feel forced
- Quality bar: you'd put this into SunoAI without editing

**Step 4 — Music Prompt** (needs step 3 output)

- Expected: comma-separated descriptors + short style note
- Quality bar: the mood matches the brand

**Step 5 — Character Prompts** (needs step 2 output)

- Expected: named characters with detailed visual description + Midjourney prompt
- Quality bar: you'd paste the Midjourney prompt directly without editing

**Step 7 — Scene Image Prompts** (needs step 2 + step 6 output)

- For step 6 output: paste 1-2 placeholder URLs (e.g. `https://example.com/char1.png`)
- Expected: one prompt per scene, references character URLs for consistency
- Quality bar: would generate coherent images if pasted into Midjourney

**Step 8 — KlingAI Animation Prompts** (needs step 2 + step 7 output)

- Expected: one prompt per scene, clear motion description, 3-8 second clips
- Quality bar: KlingAI would animate the scene correctly from this description

---

## When a prompt fails

Failure = output is generic, ignores brand context, wrong format, or just bad.

Fix strategies:

1. **Add more constraints** — tell the model what NOT to do ("not generic", "not salesy")
2. **Show an example** — add `Example output: ...` to the prompt
3. **Reduce scope** — if the output is too long, add "Keep it under 200 words"
4. **Clarify format** — add explicit format requirements with bold labels

After fixing: re-test immediately. Don't defer.

---

## Tracking validation status

Update this table as you validate each step:

| Step | Title                     | Status       | Notes                                                                                |
| ---- | ------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| 1    | Campaign Brief            | ✅ Validated | Deewas-specific 5-section brief, strong hook and emotional arc                       |
| 2    | Story Script              | ✅ Validated | 5-scene breakdown, real characters (Jordan + friends), director-ready                |
| 3    | Song Lyrics               | ✅ Validated | SunoAI format [Verse]/[Chorus]/[Bridge], natural rhyme, brand not overused           |
| 4    | Music Prompt              | ✅ Validated | "upbeat pop, 120 BPM, warm acoustic piano, female vocals, uplifting energy"          |
| 5    | Character Prompts         | ✅ Validated | Jordan + friends with --ar 1:1 --style raw Midjourney prompts, specific descriptions |
| 7    | Scene Image Prompts       | ✅ Validated | One prompt per scene, char refs included, cinematic --ar 16:9                        |
| 8    | KlingAI Animation Prompts | ✅ Validated | Clear motion + camera descriptions, 5–6 second clips per scene                       |

Status options: ⬜ Not tested / 🔄 Testing / ✅ Validated / ❌ Needs revision

---

## Automation script

Instead of testing each prompt manually with curl, use the script that chains all 7 steps automatically:

```bash
node docs/validate-prompts.mjs
```

This script:

- Interpolates Deewas test context into each prompt template
- Calls OpenAI in the correct order (1 → 2 → 3/4/5 → 7 → 8)
- Chains outputs between steps automatically
- Evaluates each output against the validation checklist
- Saves a full report to `docs/validation-outputs.md`

**To run:** ensure `OPENAI_API_KEY` in `.env` is valid, then run the script.
Review `docs/validation-outputs.md` and update this table with ✅ or ❌ per step.

---

**Output:** All 7 LLM prompts validated and finalized in `workflow-templates.ts`.

**Next step:** M4 — use Gigity to produce the first real Deewas video.
Exit criteria: one Deewas video published to TikTok/YouTube/Instagram, all 11 steps
marked done, total time under 2 hours (vs. 4-6h baseline).

