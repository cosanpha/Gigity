import { validateUrls } from '@/lib/brand-validation'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import { NextResponse } from 'next/server'

// GET /api/v1/brand - return all brand profiles
export async function GET() {
  await connectDB()
  const profiles = await BrandProfile.find().sort({ createdAt: 1 }).lean()
  return NextResponse.json(profiles)
}

// POST /api/v1/brand - create brand profile
export async function POST(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'name is required', field: 'name' },
        { status: 400 }
      )
    }
    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: 'description is required', field: 'description' },
        { status: 400 }
      )
    }
    // Validate URL fields
    const urlError = validateUrls(body)
    if (urlError) return NextResponse.json(urlError, { status: 400 })

    const profile = await BrandProfile.create(body)
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('ERROR: Failed to create brand profile', error)
    return NextResponse.json(
      { error: 'ERROR: Failed to create brand profile' },
      { status: 500 }
    )
  }
}
