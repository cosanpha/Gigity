import { apiHandler } from '@/lib/api-handler'
import type { IWorkflowStep } from '@/models/VideoProject'
import VideoProject from '@/models/VideoProject'
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

type StepPayload = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  publishPlatforms?: Record<string, string> | null
  outputAssetUrl: string | null
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
  sunoApiKeyOverride: string | null
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
}

// GET /api/v1/projects/:id — latest project (for client resync after generate)
export const GET = apiHandler(
  async (_req, ctx) => {
    const { id } = await ctx!.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const project = await VideoProject.findById(id).lean()
    if (!project)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const serialized = JSON.parse(JSON.stringify(project)) as {
      steps: Array<{ sunoApiKeyOverride?: string | null }>
    }
    for (const step of serialized.steps) {
      step.sunoApiKeyOverride = null
    }
    return NextResponse.json(serialized)
  },
  { auth: true }
)

// PATCH /api/v1/projects/:id - update title and/or save steps progress
export const PATCH = apiHandler(
  async (req, ctx) => {
    const { id } = await ctx!.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

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
        if (s.status === 'generating') {
          return
        }
        project.steps[i].status = s.status
        project.steps[i].llmResponse = s.llmResponse ?? null
        if (s.publishPlatforms !== undefined) {
          const step = project.steps[i] as IWorkflowStep
          const pp = s.publishPlatforms
          step.publishPlatforms =
            pp && typeof pp === 'object' && !Array.isArray(pp)
              ? { ...(pp as Record<string, string>) }
              : null
        }
        project.steps[i].outputAssetUrl = s.outputAssetUrl ?? null
        project.steps[i].sunoTaskId = s.sunoTaskId ?? null
        project.steps[i].sunoSelectedTrackIndex =
          typeof s.sunoSelectedTrackIndex === 'number'
            ? s.sunoSelectedTrackIndex
            : null
        // Only update sunoApiKeyOverride when a non-null value is explicitly sent
        if (
          typeof s.sunoApiKeyOverride === 'string' &&
          s.sunoApiKeyOverride.trim()
        ) {
          project.steps[i].sunoApiKeyOverride = s.sunoApiKeyOverride.trim()
        }
        project.steps[i].conversation = s.conversation ?? []
      })
    }

    await project.save()
    return NextResponse.json({ ok: true })
  },
  { auth: true }
)

// DELETE /api/v1/projects/:id
export const DELETE = apiHandler(
  async (_req, ctx) => {
    const { id } = await ctx!.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    await VideoProject.findByIdAndDelete(id)
    return NextResponse.json({ ok: true })
  },
  { auth: true }
)
