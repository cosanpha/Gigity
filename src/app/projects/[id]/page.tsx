import { Navbar } from '@/components/Navbar'
import { WorkflowClient } from '@/components/WorkflowClient'
import { SUNO_API_KEY } from '@/constants/env.server'
import { connectDB } from '@/lib/db'
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

  return (
    <>
      <Navbar
        brandName={brand.name}
        brandId={String(brand._id)}
      />
      <WorkflowClient
        project={serializedProject}
        brand={serializedBrand}
        stepDefs={WORKFLOW_STEPS}
        sunoEnabled={!!SUNO_API_KEY}
      />
    </>
  )
}
