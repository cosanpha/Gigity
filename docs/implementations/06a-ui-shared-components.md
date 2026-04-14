# 06a — UI Redesign: Shared Components

**Milestone:** UI Redesign Pass A  
**Depends on:** Any prior milestone (these are new files, no conflicts)  
**Scope:** Create 4 new shared components: `StatusBadge`, `SectionHeader`, `PageLayout`, `MotionLayout`

---

## Context

We are doing a UI redesign. Orange theme stays (`#f97316`). The goal is unified layout,
reusable components, and smooth framer-motion animations. Do NOT change any API routes,
data models, or business logic. Pure UI.

Design reference: `docs/designs/dashboard.html`, `docs/designs/workflow.html`, `docs/designs/brand.html`

---

## 1. `src/components/ui/StatusBadge.tsx` — NEW FILE

Extracted from VideoCard's local function. Used anywhere a project status badge is needed.

```tsx
export type ProjectStatus = 'in_progress' | 'completed' | 'canceled'

interface StatusBadgeProps {
  status: ProjectStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-[9px] py-[3px] text-[11.5px] font-semibold text-green-600">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-green-500" />
        Completed
      </span>
    )
  }
  if (status === 'canceled') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-[9px] py-[3px] text-[11.5px] font-semibold text-red-600">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-red-500" />
        Canceled
      </span>
    )
  }
  // in_progress
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11.5px] font-semibold text-zinc-600">
      <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-amber-400" />
      In progress
    </span>
  )
}
```

---

## 2. `src/components/ui/SectionHeader.tsx` — NEW FILE

Replaces inline section divider patterns (the `<div className="mb-2 flex items-center gap-3">` pattern).
Used in `DashboardProjectList` and `BrandForm`.

```tsx
interface SectionHeaderProps {
  label: string
  count?: number
}

export function SectionHeader({ label, count }: SectionHeaderProps) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="shrink-0 whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.08em] text-zinc-400">
        {label}
      </span>
      <span className="flex-1 border-t border-zinc-200" />
      {count !== undefined && (
        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-100 px-[7px] py-[1px] text-[11px] font-semibold text-zinc-400">
          {count}
        </span>
      )}
    </div>
  )
}
```

---

## 3. `src/components/PageLayout.tsx` — NEW FILE

Unified layout wrapper. Wraps `Navbar` + `<main>`. Used by the dashboard page.
Brand pages keep their own `<Navbar />` because they have different max-widths.

```tsx
import { Navbar, NavbarBrandOption } from '@/components/Navbar'
import type { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  brandName?: string
  brandId?: string
  brandSwitcherBrands?: NavbarBrandOption[]
  variant?: 'centered' | 'full'
  className?: string
}

export function PageLayout({
  children,
  brandName,
  brandId,
  brandSwitcherBrands,
  variant = 'centered',
  className,
}: PageLayoutProps) {
  return (
    <>
      <Navbar
        brandName={brandName}
        brandId={brandId}
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
```

---

## 4. `src/components/MotionLayout.tsx` — NEW FILE

Client wrapper for page-level fade+slide transitions. Uses framer-motion.
`AnimatePresence mode="wait"` at the page level is fine — each page has its own key.

> **Note:** framer-motion must be installed first (`bun add framer-motion`).
> Do that in chunk `06e` before this file will compile.
> For now, create the file — it will error until framer-motion is installed.

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface MotionLayoutProps {
  children: ReactNode
}

export function MotionLayout({ children }: MotionLayoutProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ display: 'contents' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

---

## Verification

After creating all 4 files:

```bash
bunx tsc --noEmit
```

Expected: TypeScript errors only on `MotionLayout.tsx` (cannot find module 'framer-motion').
That's OK — it gets resolved in chunk `06e`.

All other files should compile cleanly.
