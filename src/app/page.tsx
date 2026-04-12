import { DashboardProjectList } from '@/components/DashboardProjectList'
import { Navbar } from '@/components/Navbar'
import { NewVideoModal } from '@/components/NewVideoModal'
import { ACTIVE_BRAND_COOKIE } from '@/lib/active-brand-cookie'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<{ brand?: string }> }

type DashboardBrand = { _id: string; name: string }

type DashboardProject = {
  _id: string
  title: string
  status: 'in_progress' | 'completed'
  steps: Array<{
    stepNumber: number
    status: 'pending' | 'generating' | 'done'
  }>
  createdAt: string
}

export default async function DashboardPage({ searchParams }: Props) {
  await connectDB()

  const rawBrands = await BrandProfile.find()
    .sort({ createdAt: 1 })
    .limit(50)
    .lean()
  if (rawBrands.length === 0) redirect('/brand/new')

  // Serialize ObjectIds so they can be passed to client components (ISSUE-005)
  const brands = JSON.parse(JSON.stringify(rawBrands)) as DashboardBrand[]

  const { brand: paramBrand } = await searchParams
  const cookieStore = await cookies()
  const cookieBrand = cookieStore.get(ACTIVE_BRAND_COOKIE)?.value?.trim()
  const preferredId = paramBrand?.trim() || cookieBrand || ''
  const activeBrand =
    brands.find(b => b._id === preferredId) ?? brands[0]
  const activeBrandId = String(activeBrand._id)

  const rawProjects = await VideoProject.find({
    brandProfileId: activeBrand._id,
  })
    .sort({ createdAt: -1 })
    .lean()
  const projects = JSON.parse(JSON.stringify(rawProjects)) as DashboardProject[]

  return (
    <>
      <Navbar
        brandName={activeBrand.name}
        brandId={activeBrandId}
        brandSwitcherBrands={brands.map(b => ({
          id: String(b._id),
          name: b.name,
        }))}
      />
      <div className="mx-auto max-w-[820px] px-6 py-10 pb-20">
        {/* Page header */}
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-zinc-950">
              Videos
            </h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <NewVideoModal brandProfileId={activeBrandId} />
        </div>

        <DashboardProjectList
          projects={projects}
          brandProfileId={activeBrandId}
        />
      </div>
    </>
  )
}

