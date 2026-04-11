import { connectDB } from '@/lib/db'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

type StepPayload = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
}

// PATCH /api/v1/projects/:id - update title and/or save steps progress
export async function PATCH(req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params
  const body = await req.json()

  const project = await VideoProject.findById(id)
  if (!project)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.title?.trim()) {
    project.title = body.title.trim()
  }

  if (Array.isArray(body.steps)) {
    ;(body.steps as StepPayload[]).forEach((s, i) => {
      if (!project.steps[i]) return
      project.steps[i].status = s.status
      project.steps[i].llmResponse = s.llmResponse ?? null
      project.steps[i].outputAssetUrl = s.outputAssetUrl ?? null
      project.steps[i].sunoTaskId = s.sunoTaskId ?? null
      project.steps[i].sunoSelectedTrackIndex =
        typeof s.sunoSelectedTrackIndex === 'number'
          ? s.sunoSelectedTrackIndex
          : null
      project.steps[i].conversation = s.conversation ?? []
    })
  }

  await project.save()
  return NextResponse.json({ ok: true })
}

// DELETE /api/v1/projects/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  await connectDB()
  const { id } = await params
  await VideoProject.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
