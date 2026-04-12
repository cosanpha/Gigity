import { CLOUDINARY_CLOUD_NAME } from '@/constants/env.server'
import { apiHandler } from '@/lib/api-handler'
import { uploadImageBuffer } from '@/lib/cloudinary'
import { NextResponse } from 'next/server'

const MAX_BYTES = 25 * 1024 * 1024

export const runtime = 'nodejs'

export const POST = apiHandler(
  async (req: Request) => {
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

    const file = formData.get('image')
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'image file is required (field name: image)' },
        { status: 400 }
      )
    }

    const mime = file.type
    if (!mime.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.byteLength === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    }
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large (max 25 MB)' },
        { status: 413 }
      )
    }

    const url = await uploadImageBuffer(buf)
    return NextResponse.json({ url })
  },
  { auth: true }
)
