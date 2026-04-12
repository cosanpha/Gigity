import { LucidePlus } from 'lucide-react'
import Image from 'next/image'
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
    <nav className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-zinc-200 bg-white px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href={brandId ? `/?brand=${encodeURIComponent(brandId)}` : '/'}
          className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-zinc-950"
        >
          <Image
            src="/logo.png"
            width={28}
            height={28}
            alt="Gigity Logo"
            className="h-[28px] w-[28px] rounded-[6px]"
          />
          Gigity
        </Link>
        {/* Divider */}
        {(showSwitcher || brandName) && (
          <span className="h-4 w-px bg-zinc-200" />
        )}
        {showSwitcher ? (
          <BrandSwitcher
            brands={brandSwitcherBrands}
            activeBrandId={brandId}
          />
        ) : (
          brandName && (
            <span className="rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-[12px] font-medium text-zinc-600">
              {brandName}
            </span>
          )
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {brandId && (
          <Link
            href={`/brand/${brandId}/edit`}
            className="rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
          >
            Edit brand
          </Link>
        )}
        {!showSwitcher && (
          <Link
            href="/brand/new"
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-zinc-200 px-3 py-[5px] text-[13px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
          >
            <LucidePlus
              className="h-3.5 w-3.5"
              aria-hidden
            />
            New brand
          </Link>
        )}
      </div>
    </nav>
  )
}
