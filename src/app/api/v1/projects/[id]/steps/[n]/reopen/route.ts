import { apiHandler } from '@/lib/api-handler'
import VideoProject from '@/models/VideoProject'
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

export const POST = apiHandler(
  async (_req, ctx) => {
    const { id, n } = await ctx!.params
    const stepNumber = parseInt(n, 10)

    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 9) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const project = await VideoProject.findById(id)
    if (!project)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const step = project.steps[stepNumber - 1]

    // Re-open should only unlock the step for edits without deleting data.
    step.status = 'pending'
    step.completedAt = null
    if (stepNumber === 4) {
      step.sunoTaskId = null
    }

    project.status = 'in_progress'

    await project.save()
    return NextResponse.json({ ok: true })
  },
  { auth: true }
)
