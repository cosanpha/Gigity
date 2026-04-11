import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { isCloudinaryUrl, uploadVideoFromUrl } from '@/lib/cloudinary'
import { isProbablyVideoHttpUrl } from '@/lib/video-url'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json(
      { error: 'Cloudinary not configured' },
      { status: 501 }
    )
  }

  const body = await req.json()
  const { url } = body as { url?: string }
  const trimmed = url?.trim()

  if (!trimmed) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  if (!isProbablyVideoHttpUrl(trimmed)) {
    return NextResponse.json(
      {
        error:
          'URL does not look like a video (use .mp4, .webm, .mov, etc., or a Cloudinary /video/upload/ link).',
      },
      { status: 400 }
    )
  }

  if (isCloudinaryUrl(trimmed)) {
    return NextResponse.json({ url: trimmed })
  }

  const cloudUrl = await uploadVideoFromUrl(trimmed)
  return NextResponse.json({ url: cloudUrl })
}
