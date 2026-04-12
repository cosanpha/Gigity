import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { requireAuth } from '@/lib/auth'
import { uploadVideoBuffer } from '@/lib/cloudinary'
import { NextResponse } from 'next/server'

const MAX_BYTES = 100 * 1024 * 1024

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const deny = requireAuth(req)
  if (deny) return deny

  if (!CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json(
      { error: 'Cloudinary not configured' },
      { status: 501 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('video')
  if (!file || typeof file === 'string') {
    return NextResponse.json(
      { error: 'video file is required (field name: video)' },
      { status: 400 }
    )
  }

  const mime = file.type
  if (!mime.startsWith('video/')) {
    return NextResponse.json({ error: 'File must be a video' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 })
  }
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File too large (max 100 MB)' },
      { status: 413 }
    )
  }

  try {
    const url = await uploadVideoBuffer(buf)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('ERROR: Cloudinary video file upload failed', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
