'use client'

import { LucideCheck } from 'lucide-react'
import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[12px] text-zinc-400 transition-colors hover:text-zinc-700"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <LucideCheck className="h-3.5 w-3.5" aria-hidden />
          Copied
        </>
      ) : (
        'Copy'
      )}
    </button>
  )
}
