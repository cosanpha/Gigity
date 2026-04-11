import { EmptyState } from '@/components/EmptyState'
import { Navbar } from '@/components/Navbar'
import { NewVideoModal } from '@/components/NewVideoModal'
import { VideoCard } from '@/components/VideoCard'
import { connectDB } from '@/lib/db'
import BrandProfile from '@/models/BrandProfile'
import VideoProject from '@/models/VideoProject'
import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<{ brand?: string }> }

export default async function DashboardPage({ searchParams }: Props) {
  await connectDB()

  const brands = await BrandProfile.find().sort({ createdAt: 1 }).lean()
  if (brands.length === 0) redirect('/brand/new')

  const { brand: brandId } = await searchParams
  const activeBrand = brands.find(b => String(b._id) === brandId) ?? brands[0]
  const activeBrandId = String(activeBrand._id)

  const projects = await VideoProject.find({ brandProfileId: activeBrand._id })
    .sort({ createdAt: -1 })
    .lean()

  return (
    <>
      <Navbar
        brandName={activeBrand.name}
        brandId={activeBrandId}
      />
      <div className="mx-auto max-w-[780px] px-6 py-10 pb-20">
        {/* Brand tabs (shown when multiple brands exist) */}
        {brands.length > 1 && (
          <div className="mb-8 flex items-center gap-2 overflow-x-auto">
            {brands.map(b => {
              const id = String(b._id)
              const isActive = id === activeBrandId
              return (
                <a
                  key={id}
                  href={`/?brand=${id}`}
                  className={`rounded-full border px-4 py-1.5 text-[13px] whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  {b.name}
                </a>
              )
            })}
            <a
              href="/brand/new"
              className="rounded-full border border-dashed border-zinc-300 px-4 py-1.5 text-[13px] whitespace-nowrap text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
            >
              + New brand
            </a>
          </div>
        )}

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Videos</h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <NewVideoModal brandProfileId={activeBrandId} />
        </div>

        {projects.length === 0 ? (
          <EmptyState brandProfileId={activeBrandId} />
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map(p => (
              <VideoCard
                key={String(p._id)}
                project={p}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

