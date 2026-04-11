export type KlingSceneParsed = {
  sceneNumber: number
  title: string
  lyric: string
  prompt: string
}

export function extractKlingScenesForEdit(text: string): KlingSceneParsed[] {
  const blocks = text.split(/(?=\*\*Scene \d+)/)
  const parsed = blocks
    .filter(block => /^\*\*Scene \d+/.test(block.trim()))
    .map(block => {
      const headerMatch = block.match(/\*\*Scene (\d+)\s*[--]\s*([^*\n]+)\*\*/)
      const sceneNumber = headerMatch ? parseInt(headerMatch[1], 10) : 0
      const title = headerMatch?.[2]?.trim() ?? ''
      const lyricMatch = block.match(/Lyric:\s*"([^"]+)"/)
      const lyric = lyricMatch?.[1] ?? ''
      const promptMatch = block.match(
        /KlingAI prompt:\s*([\s\S]+?)(?=\n\n|\n\*\*|$)/
      )
      const prompt = promptMatch?.[1]?.trim() ?? ''
      return { sceneNumber, title, lyric, prompt }
    })
    .filter(s => s.sceneNumber > 0)

  if (parsed.length > 0) return parsed

  const legacyBlocks = text.split(/\*\*Scene \d+/).slice(1)
  return legacyBlocks.map((block, i) => {
    const lyricMatch = block.match(/Lyric:\s*"([^"]+)"/)
    const promptMatch = block.match(
      /KlingAI prompt:\s*([\s\S]+?)(?=\n\n|\n\*\*|$)/
    )
    return {
      sceneNumber: i + 1,
      title: '',
      lyric: lyricMatch?.[1] ?? '',
      prompt: promptMatch?.[1]?.trim() ?? '',
    }
  })
}

export function replaceKlingScenePrompt(
  fullText: string,
  sceneIndex: number,
  newPrompt: string
): string {
  const parts = fullText.split(/(?=\*\*Scene \d+)/)
  let idx = -1
  return parts
    .map(part => {
      if (!/^\*\*Scene \d+/.test(part.trim())) return part
      idx += 1
      if (idx !== sceneIndex) return part
      return part.replace(
        /(KlingAI prompt:\s*)([\s\S]+?)(?=\n\n|\n\*\*|$)/,
        (_match, prefix: string) => `${prefix}${newPrompt}`
      )
    })
    .join('')
}

export function parseKlingScenes(text: string): Array<{
  title: string
  lyric: string
  prompt: string
}> {
  return extractKlingScenesForEdit(text).map(s => ({
    title: `Scene ${s.sceneNumber}${s.title ? ` - ${s.title}` : ''}`,
    lyric: s.lyric,
    prompt: s.prompt,
  }))
}
