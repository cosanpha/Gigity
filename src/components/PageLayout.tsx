import { Navbar, NavbarBrandOption } from '@/components/Navbar'
import type { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  brandName?: string
  brandId?: string
  brandLogoUrl?: string
  brandSwitcherBrands?: NavbarBrandOption[]
  variant?: 'centered' | 'full'
  className?: string
}

export function PageLayout({
  children,
  brandName,
  brandId,
  brandLogoUrl,
  brandSwitcherBrands,
  variant = 'centered',
  className,
}: PageLayoutProps) {
  return (
    <>
      <Navbar
        brandName={brandName}
        brandId={brandId}
        brandLogoUrl={brandLogoUrl}
        brandSwitcherBrands={brandSwitcherBrands}
      />
      {variant === 'centered' ? (
        <main className={`mx-auto max-w-[820px] px-6 py-10 pb-20 ${className ?? ''}`}>
          {children}
        </main>
      ) : (
        <main className={`flex min-h-0 flex-1 ${className ?? ''}`}>
          {children}
        </main>
      )}
    </>
  )
}
