/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiHandler } from '@/lib/api-handler'
import VideoProject from '@/models/VideoProject'
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/workflow/suno/callback
 *
 * Suno sends task progress / completion here. We find the project whose step 4
 * holds the matching taskId and update its outputAssetUrl with the first audio
 * URL when the task completes.
 */
export const POST = apiHandler(async (req: Request) => {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: true })

    // Suno callback shape (varies by provider - handle both common formats)
    const taskId: string | undefined =
      body.taskId ?? body.data?.taskId ?? body.task_id
    const status: string | undefined = body.status ?? body.data?.status
    const audioUrl: string | undefined =
      body.data?.audioUrl ??
      body.audioUrl ??
      body.data?.audio_url ??
      body.audio_url ??
      body.data?.clips?.[0]?.audio_url ??
      body.clips?.[0]?.audio_url

    if (!taskId || status !== 'complete' || !audioUrl) {
      // Not a completion event - acknowledge and ignore
      return NextResponse.json({ ok: true })
    }

    // Find the project whose step 4 has this taskId
    const project = await VideoProject.findOne({
      'steps.sunoTaskId': taskId,
    })

    if (!project) return NextResponse.json({ ok: true })

    const step4 = project.steps[3]
    if (step4?.sunoTaskId === taskId && !step4.outputAssetUrl) {
      step4.outputAssetUrl = audioUrl
      await project.save()
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('ERROR: Suno callback failed', err)
    // Always return 200 so Suno doesn't retry forever
    return NextResponse.json({ ok: true })
  }
})
