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
