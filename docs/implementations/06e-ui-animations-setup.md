# 06e — UI Redesign: framer-motion Install + MotionLayout

**Milestone:** UI Redesign Pass A  
**Depends on:** `06a` (MotionLayout file must exist, even if it errors until this chunk runs)  
**Scope:** Install framer-motion, wire MotionLayout into root layout

---

## Context

framer-motion is used for:

- Page-level fade/slide transitions (`MotionLayout` in `layout.tsx`)
- Card stagger animations in `DashboardProjectList` (chunk `06c`)
- Step panel slide animations in `WorkflowClient` (chunk `06f`)
- Sidebar item entrance animations in `StepSidebar` (chunk `06f`)
- Modal scale/fade in `NewVideoModal` (chunk `06h`)

This chunk installs framer-motion and wires the root MotionLayout. Run this before `06c`, `06f`, `06h`.

---

## 1. Install framer-motion

```bash
bun add framer-motion
```

Verify it was added to `package.json` dependencies (not devDependencies).

---

## 2. `src/components/MotionLayout.tsx` — CREATE (if not already done in `06a`)

If this file already exists from `06a`, skip this step.

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
    <AnimatePresence
      mode="wait"
      initial={false}
    >
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

Key notes:

- `'use client'` is required (uses hooks and framer-motion)
- `style={{ display: 'contents' }}` means `motion.div` does not create a layout box — children flow as if the wrapper isn't there
- `mode="wait"` means old page exits before new page enters (clean transition, no overlap)
- `initial={false}` skips the animation on first page load

---

## 3. `src/app/layout.tsx` — MODIFY

### 3a. Add import

Add at the top:

```tsx
import { MotionLayout } from '@/components/MotionLayout'
```

### 3b. Wrap children

Find:

```tsx
<body className="antialiased">
  <AuthTokenBootstrap />
  {children}
</body>
```

Replace with:

```tsx
<body className="antialiased">
  <AuthTokenBootstrap />
  <MotionLayout>{children}</MotionLayout>
</body>
```

Full layout file after changes:

```tsx
import { AuthTokenBootstrap } from '@/components/AuthTokenBootstrap'
import { MotionLayout } from '@/components/MotionLayout'
import { PUBLIC_APP_URL } from '@/constants/env.server'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gigity',
  // ... rest unchanged
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthTokenBootstrap />
        <MotionLayout>{children}</MotionLayout>
      </body>
    </html>
  )
}
```

---

## Verification

```bash
bunx tsc --noEmit
```

Expected: zero errors. The framer-motion import error that existed before `bun add framer-motion` should now be gone.

Visual check:

- Navigate between pages — there should be a subtle fade+slide-up entrance on each page
- No layout shift or flicker during transitions

