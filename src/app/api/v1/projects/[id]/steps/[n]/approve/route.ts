import { SUNO_API_BASE_URL, SUNO_API_KEY } from '@/constants/env.server'
import { connectDB } from '@/lib/db'
import { getStepDefinition } from '@/lib/workflow-templates'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string; n: string }> }

// Steps that require outputAssetUrl when approved (character, scene, Kling)
const STEPS_REQUIRING_URL = [5, 6, 7]

export async function POST(req: Request, { params }: Ctx) {
  try {
    await connectDB()

    const { id, n } = await params
    const stepNumber = parseInt(n, 10)

    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 9) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { outputAssetUrl } = body as { outputAssetUrl?: string }

    const project = await VideoProject.findById(id)
    if (!project)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const stepDef = getStepDefinition(stepNumber)
    const step = project.steps[stepNumber - 1]

    // Idempotent - approving an already-done step is a no-op
    if (step.status === 'done') {
      return NextResponse.json({ ok: true })
    }

    // Enforce ordering: step N-1 must be done before N can be approved
    if (stepNumber > 1 && project.steps[stepNumber - 2].status !== 'done') {
      return NextResponse.json(
        { error: `Complete step ${stepNumber - 1} first` },
        { status: 400 }
      )
    }

    // LLM step: must have a response to approve
    if (stepDef?.type === 'llm' && !step.llmResponse) {
      return NextResponse.json(
        { error: 'Generate output before approving' },
        { status: 400 }
      )
    }

    // Character (5), scene (6), Kling (7) require outputAssetUrl
    if (STEPS_REQUIRING_URL.includes(stepNumber)) {
      const url = outputAssetUrl?.trim()
      if (!url) {
        return NextResponse.json(
          { error: 'outputAssetUrl is required for this step' },
          { status: 400 }
        )
      }
      step.outputAssetUrl = url
    } else if (stepNumber === 4) {
      const fromBody = outputAssetUrl?.trim()
      if (fromBody) {
        step.outputAssetUrl = fromBody
      }
      const sunoConfigured =
        Boolean(SUNO_API_KEY?.trim()) && Boolean(SUNO_API_BASE_URL?.trim())
      if (sunoConfigured && !step.outputAssetUrl?.trim()) {
        return NextResponse.json(
          { error: 'Generate a song before approving this step' },
          { status: 400 }
        )
      }
    }

    if (stepNumber === 4) {
      step.sunoTaskId = null
    }

    // Mark done
    step.status = 'done'
    step.completedAt = new Date()

    // Completing step 9 finishes the whole project
    if (stepNumber === 9) {
      project.status = 'completed'
    }

    await project.save()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('ERROR: Failed to approve step', error)
    return NextResponse.json(
      { error: 'ERROR: Failed to approve step' },
      { status: 500 }
    )
  }
}
