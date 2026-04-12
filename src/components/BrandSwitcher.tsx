'use client'

import { LucideChevronDown, LucidePlus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export interface BrandSwitcherOption {
  id: string
  name: string
}

interface BrandSwitcherProps {
  brands: BrandSwitcherOption[]
  activeBrandId: string
}

export function BrandSwitcher({ brands, activeBrandId }: BrandSwitcherProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const active = brands.find(b => b.id === activeBrandId) ?? brands[0]

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-[10px] py-[3px] text-left text-[12px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-200"
      >
        <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-orange-500" />
        <span className="max-w-[180px] truncate">{active?.name}</span>
        <LucideChevronDown
          size={12}
          className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 z-20 min-w-[200px] rounded-[6px] border border-zinc-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {brands.map(b => {
            const isActive = b.id === activeBrandId
            return (
              <Link
                key={b.id}
                href={`/?brand=${b.id}`}
                role="menuitem"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-orange-50 font-medium text-orange-700'
                    : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {b.name}
              </Link>
            )
          })}
          <div className="my-1 border-t border-zinc-100" />
          <Link
            href="/brand/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
          >
            <LucidePlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            New brand
          </Link>
        </div>
      )}
    </div>
  )
}
