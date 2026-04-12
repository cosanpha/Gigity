import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { apiHandler } from '@/lib/api-handler'
import { isCloudinaryUrl, uploadFromUrl } from '@/lib/cloudinary'
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

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json(
      { error: 'url must start with http:// or https://' },
      { status: 400 }
    )
  }

  if (isCloudinaryUrl(url)) {
    return NextResponse.json({ url })
  }

  try {
    const cloudUrl = await uploadFromUrl(url)
    return NextResponse.json({ url: cloudUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}, { auth: true })
