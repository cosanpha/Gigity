import { normalizePublishPlatforms } from '@/lib/publish-copy'

const BRAND_LINKS_SHORT_FORM = `If the context includes a line starting with "Brand links (site, app stores, etc.):" with one or more URLs, add a short call-to-action block that includes those same URLs in full (paste-ready), with emoji labels where helpful. Infer labels from each URL when obvious (e.g. apps.apple.com to iOS / App Store, play.google.com to Android / Google Play, otherwise "Learn more" or the hostname). Place that block before any hashtag line at the end. If there are no brand links in the context, do not invent URLs.`

function shortFormSection(heading: string, labelForText: string): string {
  return `## ${heading}
Caption or post text for ${labelForText}. Open with a strong hook on the first line. Keep length appropriate for the app (stay under 2200 characters). Include relevant hashtags at the end (roughly 3-6).
${BRAND_LINKS_SHORT_FORM}`
}

function youtubeLongSection(): string {
  return `## YouTube
Title: [single line, under 100 characters]

Description:
[2-4 short paragraphs: what the video offers, who it is for, phrased in the brand's tone (see "Tone:" in context), and a clear but natural call to action. Use line breaks and emojis so it is easy to scan.]
Then add a dedicated "Download" or "Get the app / Learn more" style section (short heading line with emoji optional) that lists every URL from the context line "Brand links (site, app stores, etc.):". Copy each URL exactly, one per line, with a clear label (iOS, Android, Website, etc.) where you can infer from the URL. If that brand links line is absent or empty, end with a generic CTA only and do not make up links.
After that section, add a line of keyword tags or hashtags at the very end.`
}

function twitterSection(): string {
  return `## Twitter / X
Post text for X: strong hook, short scannable lines, optional 1-4 hashtags. Keep it feed-friendly (not a wall of text; well under 4000 characters).
If the context includes "Brand links (site, app stores, etc.):" with one or more URLs, add one compact block with every URL in full (paste-ready), emoji labels where helpful. Same label rules as other platforms. If there are no brand links in the context, do not invent URLs.`
}

function sectionForPlatform(name: string): string {
  switch (name) {
    case 'TikTok':
      return shortFormSection('TikTok', 'TikTok')
    case 'YouTube Shorts':
      return shortFormSection('YouTube Shorts', 'YouTube Shorts')
    case 'Instagram Reels':
      return shortFormSection('Instagram Reels', 'Instagram Reels')
    case 'YouTube':
      return youtubeLongSection()
    case 'Twitter / X':
      return twitterSection()
    default:
      return `## ${name}
Post or caption appropriate for ${name}: hook, body, and hashtags or keywords as typical for that network. Under 2200 characters unless the network is clearly long-form.
${BRAND_LINKS_SHORT_FORM}`
  }
}

export function buildPublishPlatformSections(platforms: string[]): string {
  return platforms.map(sectionForPlatform).join('\n\n')
}

export function buildPublishUserPrompt(platforms: string[]): string {
  const list = normalizePublishPlatforms(platforms)
  const platformListStr = list.join(', ')
  const sections = buildPublishPlatformSections(list)

  return `Write publish-ready video or social copy for the short-form ad described in your context (campaign, story, lyrics, and prior steps).

The brand publishes on: ${platformListStr}. Output one section per platform below, in that same order, using the exact ## headings given. Do not add sections for platforms not listed.

Voice and tone (required):
- In your context, the line that begins with "Tone:" lists the brand profile tone tags (e.g. comma-separated adjectives). Treat that as the primary reference for how ALL of this copy should sound: formality, warmth, energy, humor, and directness.
- Every line of copy in every platform section should feel consistent with those tone tags, not generic marketing voice.
- If Tone is "Not specified" or empty, infer voice from the brand description, target audience, and prior step outputs, and keep it consistent across all sections.

Emojis (required for output):
- Use emojis generously and on purpose on short-form captions (TikTok, YouTube Shorts, Instagram Reels, Twitter / X): hook line, breaks, CTA, link lines. Long-form YouTube description: emojis on section headers, bullets, download lines. Match density to the brand tone (playful brands: more; very minimal brands: fewer but still at least a few where they help scanning).
- YouTube title line (long-form YouTube section only): optional 0-1 emoji at the start or end if it fits tone and does not look spammy.

Banned characters and AI-slop (required):
- Never use the em dash character (Unicode U+2014, looks like a long dash between words). Use a comma, period, colon, parenthesis, or a normal hyphen-minus (-) instead.
- Do not use other typographic "fancy" punctuation that reads as AI polish unless the brand tone clearly demands it.
- Avoid stock AI phrases and cadence, for example: "delve", "tapestry", "landscape" (metaphorical), "it's important to note", "in today's world", "unlock", "elevate your", "game-changer", "leverage", "synergy", "whether you're X or Y". Write like a real creator, not a template.

Output format - use these exact headings (and only these, in order):

${sections}

Rules:
- Tailor pacing to each network (short-form vs searchable long-form YouTube), but tone still comes from the brand profile "Tone:" line above all else.
- Do not use placeholders like "[insert]" or "TBD" - write final copy the creator can paste as-is.`
}
