import { llmModelPublishDescription } from '@/constants/workflow-llm-models'
import { apiHandler } from '@/lib/api-handler'
import { buildMessages, buildSystemMessage, callLLM } from '@/lib/llm'
import {
  joinPublishMarkdown,
  mergeParsedIntoPlatformOrder,
  normalizePublishPlatforms,
  splitPublishMarkdownByHeading,
} from '@/lib/publish-copy'
import { IBrandProfile } from '@/models/BrandProfile'
import type { IWorkflowStep } from '@/models/VideoProject'
import VideoProject from '@/models/VideoProject'
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { buildPublishUserPrompt } from './publish-prompt'

export const POST = apiHandler(
  async (_req, ctx) => {
    const { id } = await ctx!.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const project = await VideoProject.findById(id).populate('brandProfileId')
    if (!project)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const storyStep = project.steps[1]
    if (!storyStep?.llmResponse?.trim()) {
      return NextResponse.json(
        {
          error: 'Add a story script (step 2) before generating publish copy.',
        },
        { status: 400 }
      )
    }

    const brand = project.brandProfileId as unknown as IBrandProfile

    const systemMessage = buildSystemMessage(brand, project.steps)
    const userPrompt = buildPublishUserPrompt(brand.platforms ?? [])
    const messages = buildMessages(systemMessage, userPrompt, [])

    const step9 = project.steps[8]
    if (!step9) {
      return NextResponse.json(
        { error: 'Invalid project steps' },
        { status: 500 }
      )
    }

    // Guard against concurrent generate requests
    if (step9.status === 'generating') {
      return NextResponse.json({ error: 'Already generating' }, { status: 409 })
    }

    step9.status = 'generating'
    await project.save()

    try {
      const response = await callLLM(messages, {
        model: llmModelPublishDescription(),
      })
      const order = normalizePublishPlatforms(brand.platforms ?? [])
      const parsed = splitPublishMarkdownByHeading(response)
      const merged = mergeParsedIntoPlatformOrder(parsed, order)
      const joined = joinPublishMarkdown(order, merged)
      const s9 = step9 as IWorkflowStep
      s9.llmResponse = joined
      s9.publishPlatforms = merged
      step9.status = 'pending'
      project.markModified('steps')
      await project.save()
      return NextResponse.json({
        llmResponse: joined,
        publishPlatforms: merged,
      })
    } catch (err: unknown) {
      step9.status = 'pending'
      await project.save().catch(() => {})
      const message = err instanceof Error ? err.message : 'LLM request failed'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  },
  { auth: true }
)
