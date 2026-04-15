import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { apiHandler } from '@/lib/api-handler'
import { isCloudinaryUrl, uploadVideoFromUrl } from '@/lib/cloudinary'
import { isProbablyVideoHttpUrl } from '@/lib/url-utils'
import { NextResponse } from 'next/server'

export const POST = apiHandler(async (req: Request) => {
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

  try {
    const cloudUrl = await uploadVideoFromUrl(trimmed)
    return NextResponse.json({ url: cloudUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}, { auth: true })
