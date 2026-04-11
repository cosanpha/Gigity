import { OPENAI_API_KEY } from '@/constants/env.server'
import { isCloudinaryUrl, uploadFromUrl } from '@/lib/cloudinary'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 501 }
    )
  }

  const body = await req.json()
  const { prompt, size = '1024x1792' } = body as {
    prompt?: string
    size?: string
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  // Call DALL-E 3
  const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size, // 1024x1792 = portrait 9:16
      quality: 'standard',
    }),
  })

  if (!dalleRes.ok) {
    const err = await dalleRes.text()
    return NextResponse.json({ error: `DALL-E error: ${err}` }, { status: 502 })
  }

  const dalleData = await dalleRes.json()
  const tempUrl = dalleData?.data?.[0]?.url

  if (!tempUrl) {
    return NextResponse.json(
      { error: 'No image URL in DALL-E response' },
      { status: 502 }
    )
  }

  // Upload to Cloudinary immediately - DALL-E URLs expire in ~1 hour
  const cloudUrl = isCloudinaryUrl(tempUrl)
    ? tempUrl
    : await uploadFromUrl(tempUrl, 'gigity/images')

  return NextResponse.json({ url: cloudUrl, tempUrl })
}
