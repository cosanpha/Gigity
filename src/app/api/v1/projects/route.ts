import { apiHandler } from '@/lib/api-handler'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

// POST /api/v1/projects - create a new video project
export const POST = apiHandler(
  async (req: Request) => {
    const body = await req.json()
    const { brandProfileId, title } = body

    if (!brandProfileId) {
      return NextResponse.json(
        { error: 'brandProfileId is required' },
        { status: 400 }
      )
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'title is too long (max 200 characters)' },
        { status: 400 }
      )
    }

    // Validate the brand profile exists
    const brand = await BrandProfile.findById(brandProfileId)
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      )
    }

    // Initialize all workflow steps as pending
    const steps = Array.from({ length: 9 }, (_, i) => ({
      stepNumber: i + 1,
      conversation: [],
      llmResponse: null,
      publishPlatforms: null,
      outputAssetUrl: null,
      sunoTaskId: null,
      sunoSelectedTrackIndex: null,
      sunoApiKeyOverride: null,
      status: 'pending',
      completedAt: null,
    }))

    const project = await VideoProject.create({
      brandProfileId,
      title: title.trim(),
      steps,
    })

    return NextResponse.json(project, { status: 201 })
  },
  { auth: true }
)
