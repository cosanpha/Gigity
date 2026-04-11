import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { isCloudinaryUrl, uploadFromUrl } from '@/lib/cloudinary'
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

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Validate it looks like a URL
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json(
      { error: 'url must start with http:// or https://' },
      { status: 400 }
    )
  }

  // Already on Cloudinary — return as-is
  if (isCloudinaryUrl(url)) {
    return NextResponse.json({ url })
  }

  const cloudUrl = await uploadFromUrl(url)
  return NextResponse.json({ url: cloudUrl })
}
