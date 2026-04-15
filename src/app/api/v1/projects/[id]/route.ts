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

type ProjectStatus = 'in_progress' | 'completed' | 'canceled'

// GET /api/v1/projects/:id - latest project (for client resync after generate)
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

    if (body.status) {
      const allowedStatuses: ProjectStatus[] = [
        'in_progress',
        'completed',
        'canceled',
      ]
      if (!allowedStatuses.includes(body.status as ProjectStatus)) {
        return NextResponse.json(
          { error: 'Invalid project status' },
          { status: 400 }
        )
      }
      project.status = body.status as ProjectStatus
    }

    if (Array.isArray(body.steps)) {
      const allowedPatchStatuses: StepPayload['status'][] = ['pending', 'generating']
      ;(body.steps as StepPayload[]).forEach((s, i) => {
        if (!project.steps[i]) return
        if (!allowedPatchStatuses.includes(s.status)) {
          return
        }
        project.steps[i].status = s.status
        project.steps[i].llmResponse = s.llmResponse ?? null
        if (s.publishPlatforms !== undefined) {
          const step = project.steps[i] as IWorkflowStep
          const pp = s.publishPlatforms
          if (pp && typeof pp === 'object' && !Array.isArray(pp)) {
            const entries = Object.entries(pp as Record<string, unknown>)
            const isValid = entries.every(
              ([key, value]) => key.trim().length > 0 && typeof value === 'string'
            )
            step.publishPlatforms = isValid
              ? Object.fromEntries(
                  entries.map(([key, value]) => [key, value as string])
                )
              : null
          } else {
            step.publishPlatforms = null
          }
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
