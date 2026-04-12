import { Navbar } from '@/components/Navbar'
import { WorkflowClient } from '@/components/WorkflowClient'
import { SUNO_API_BASE_URL, SUNO_API_KEY } from '@/constants/env.server'
import { connectDB } from '@/lib/db'
import {
  migrateLegacyElevenSteps,
  migrateLegacyTenSteps,
} from '@/lib/migrate-project-steps'
import { WORKFLOW_STEPS } from '@/lib/workflow-templates'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function ProjectPage({ params }: Props) {
  await connectDB()
  const { id } = await params

  const project = await VideoProject.findById(id).lean()
  if (!project) notFound()

  const brand = await BrandProfile.findById(project.brandProfileId).lean()
  if (!brand) notFound()

  const serializedProject = JSON.parse(JSON.stringify(project))
  const serializedBrand = JSON.parse(JSON.stringify(brand))

  // Redact Suno API keys - never send them to the client (ISSUE-004)
  for (const step of serializedProject.steps) {
    step.sunoApiKeyOverride = null
  }

  let steps = serializedProject.steps
  let migrated = false
  const m11 = migrateLegacyElevenSteps(steps)
  steps = m11.steps
  migrated = migrated || m11.migrated
  const m10 = migrateLegacyTenSteps(steps)
  steps = m10.steps
  migrated = migrated || m10.migrated
  if (migrated) {
    serializedProject.steps = steps
    await VideoProject.findByIdAndUpdate(id, {
      $set: { steps },
    })
  }

  return (
    <>
      <Navbar
        brandName={brand.name}
        brandId={String(brand._id)}
      />
      <WorkflowClient
        project={serializedProject}
        brand={serializedBrand}
        brandProfileId={String(project.brandProfileId)}
        stepDefs={WORKFLOW_STEPS}
        sunoBaseUrlConfigured={Boolean(SUNO_API_BASE_URL?.trim())}
        sunoEnvKeyConfigured={Boolean(SUNO_API_KEY?.trim())}
      />
    </>
  )
}
