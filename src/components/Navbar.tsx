import Link from 'next/link'
import { BrandSwitcher } from './BrandSwitcher'

export interface NavbarBrandOption {
  id: string
  name: string
}

interface NavbarProps {
  brandName?: string
  brandId?: string
  /** Dashboard: pass all brands to show a nav dropdown when there are 2+. */
  brandSwitcherBrands?: NavbarBrandOption[]
}

export function Navbar({
  brandName,
  brandId,
  brandSwitcherBrands,
}: NavbarProps) {
  const showSwitcher =
    brandSwitcherBrands && brandSwitcherBrands.length > 1 && brandId

  return (
    <nav className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-indigo-500 text-[13px] font-bold text-white">
            G
          </div>
          Gigity
        </Link>
        {showSwitcher ? (
          <BrandSwitcher
            brands={brandSwitcherBrands}
            activeBrandId={brandId}
          />
        ) : (
          brandName && (
            <span className="rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[13px] text-zinc-500">
              {brandName}
            </span>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        {brandId && (
          <Link
            href={`/brand/${brandId}/edit`}
            className="rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950"
          >
            Edit brand
          </Link>
        )}
        {!showSwitcher && (
          <Link
            href="/brand/new"
            className="rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950"
          >
            + New brand
          </Link>
        )}
      </div>
    </nav>
  )
}
