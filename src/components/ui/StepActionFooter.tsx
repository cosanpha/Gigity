import { LucideChevronUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'

interface StepActionFooterProps {
  leftActions?: ReactNode
  rightActions?: ReactNode
  helperText?: ReactNode
}

export function StepActionFooter({
  leftActions,
  rightActions,
  helperText,
}: StepActionFooterProps) {
  const [expanded, setExpanded] = useState(false)
  if (!leftActions && !rightActions && !helperText) return null

  return (
    <div
      className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2 md:right-6"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {helperText && expanded ? (
        <div className="max-w-[260px] rounded-[8px] border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-600 shadow-sm">
          {helperText}
        </div>
      ) : null}

      <div
        className={`flex flex-col items-end gap-2 transition-all duration-200 ${
          expanded
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-1 opacity-0'
        }`}
      >
        {rightActions ? <div>{rightActions}</div> : null}
        {leftActions ? <div>{leftActions}</div> : null}
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-label={expanded ? 'Hide actions' : 'Show actions'}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] transition-all hover:bg-orange-600"
      >
        <LucideChevronUp
          className={`h-5 w-5 transition-transform duration-200 ${
            expanded ? 'rotate-180' : 'rotate-0'
          }`}
          aria-hidden
        />
      </button>
    </div>
  )
}

