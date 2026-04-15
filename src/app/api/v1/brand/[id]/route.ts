import { apiHandler } from '@/lib/api-handler'
import { validateUrls } from '@/lib/brand-validation'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

export const GET = apiHandler(async (_req, ctx) => {
  const { id } = await ctx!.params
  const profile = await BrandProfile.findById(id).lean()
  if (!profile)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(profile, { status: 200 })
}, { auth: true })

export const PUT = apiHandler(
  async (req, ctx) => {
    const { id } = await ctx!.params
    const body = await req.json()

    const urlError = validateUrls(body)
    if (urlError) return NextResponse.json(urlError, { status: 400 })

    const profile = await BrandProfile.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean()
    if (!profile)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(profile, { status: 200 })
  },
  { auth: true }
)

// DELETE - blocked if any VideoProject references this brand
export const DELETE = apiHandler(
  async (_req, ctx) => {
    const { id } = await ctx!.params

    const inUse = await VideoProject.exists({ brandProfileId: id })
    if (inUse) {
      return NextResponse.json(
        { error: 'Cannot delete brand with existing video projects' },
        { status: 409 }
      )
    }

    await BrandProfile.findByIdAndDelete(id)
    return NextResponse.json({ ok: true }, { status: 200 })
  },
  { auth: true }
)
