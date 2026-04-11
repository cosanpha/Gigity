import { connectDB } from '@/lib/db'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string; n: string }> }

export async function POST(_req: Request, { params }: Ctx) {
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

    const project = await VideoProject.findById(id)
    if (!project)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const step = project.steps[stepNumber - 1]

    if (
      stepNumber === 1 ||
      stepNumber === 2 ||
      stepNumber === 3 ||
      stepNumber === 4 ||
      stepNumber === 7
    ) {
      step.status = 'pending'
      step.completedAt = null
      if (stepNumber === 4) {
        step.sunoTaskId = null
      }
      if (stepNumber === 7) {
        step.outputAssetUrl = null
      }
    } else {
      step.status = 'pending'
      step.llmResponse = null
      step.outputAssetUrl = null
      step.conversation = []
      step.completedAt = null
    }

    await project.save()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('ERROR: Failed to reopen step', error)
    return NextResponse.json(
      { error: 'ERROR: Failed to reopen step' },
      { status: 500 }
    )
  }
}
