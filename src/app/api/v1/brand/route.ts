import { apiHandler } from '@/lib/api-handler'
import { validateUrls } from '@/lib/brand-validation'
import BrandProfile from '@/models/BrandProfile'
import { NextResponse } from 'next/server'

// GET /api/v1/brand - return all brand profiles
export const GET = apiHandler(async () => {
  const profiles = await BrandProfile.find().sort({ createdAt: 1 }).lean()
  return NextResponse.json(profiles)
})

// POST /api/v1/brand - create brand profile
export const POST = apiHandler(async (req: Request) => {
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
  // Length limits (ISSUE-015)
  if (body.name?.length > 200) {
    return NextResponse.json({ error: 'name is too long (max 200 characters)', field: 'name' }, { status: 400 })
  }
  if (body.description?.length > 5000) {
    return NextResponse.json({ error: 'description is too long (max 5000 characters)', field: 'description' }, { status: 400 })
  }
  if (body.targetAudience?.length > 2000) {
    return NextResponse.json({ error: 'targetAudience is too long (max 2000 characters)', field: 'targetAudience' }, { status: 400 })
  }
  if (body.tone?.length > 500) {
    return NextResponse.json({ error: 'tone is too long (max 500 characters)', field: 'tone' }, { status: 400 })
  }
  // Validate URL fields
  const urlError = validateUrls(body)
  if (urlError) return NextResponse.json(urlError, { status: 400 })

  const {
    name,
    description,
    targetAudience,
    tone,
    platforms,
    exampleVideoUrls,
    avatarUrl,
    logoUrl,
  } = body
  const resolvedLogoUrl =
    typeof logoUrl === 'string'
      ? logoUrl
      : typeof avatarUrl === 'string'
        ? avatarUrl
        : ''
  const profile = await BrandProfile.create({
    name,
    description,
    targetAudience,
    tone,
    platforms,
    exampleVideoUrls,
    logoUrl: resolvedLogoUrl,
  })
  return NextResponse.json(profile, { status: 201 })
}, { auth: true })
