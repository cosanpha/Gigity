import { validateUrls } from '@/lib/brand-validation'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await connectDB()
    const { id } = await params
    const profile = await BrandProfile.findById(id).lean()
    if (!profile)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(profile, { status: 200 })
  } catch (error) {
    console.error('ERROR: Failed to get brand profile', error)
    return NextResponse.json(
      { error: 'ERROR: Failed to get brand profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    await connectDB()
    const { id } = await params
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
  } catch (error) {
    console.error('ERROR: Failed to update brand profile', error)
    return NextResponse.json(
      { error: 'ERROR: Failed to update brand profile' },
      { status: 500 }
    )
  }
}

// DELETE - blocked if any VideoProject references this brand
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await connectDB()
    const { id } = await params

    const inUse = await VideoProject.exists({ brandProfileId: id })
    if (inUse) {
      return NextResponse.json(
        { error: 'Cannot delete brand with existing video projects' },
        { status: 409 }
      )
    }

    await BrandProfile.findByIdAndDelete(id)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('ERROR: Failed to delete brand profile', error)
    return NextResponse.json(
      { error: 'ERROR: Failed to delete brand profile' },
      { status: 500 }
    )
  }
}
