'use client'

import { pastedTextHasOnlyHttpUrls } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import * as React from 'react'

const INVALID_PASTE_MSG =
  'Each line must be a full URL starting with http:// or https:// (remove any non-link text).'

/** Multi-line URL list: typing disabled; paste or drop replaces content. */
export function PasteOnlyUrlTextarea({
  className,
  value,
  onValueChange,
  ...rest
}: {
  value: string
  onValueChange: (value: string) => void
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'readOnly' | 'onPaste' | 'onDrop' | 'onDragOver'
>) {
  const [pasteError, setPasteError] = React.useState<string | null>(null)

  function tryApplyPastedText(raw: string) {
    setPasteError(null)
    const trimmedEnd = raw.replace(/\s+$/g, '')
    if (trimmedEnd.trim() === '') {
      onValueChange('')
      return
    }
    if (!pastedTextHasOnlyHttpUrls(trimmedEnd)) {
      setPasteError(INVALID_PASTE_MSG)
      return
    }
    onValueChange(trimmedEnd)
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <textarea
        readOnly
        value={value}
        onPaste={e => {
          e.preventDefault()
          tryApplyPastedText(e.clipboardData.getData('text/plain'))
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const t = e.dataTransfer.getData('text/plain')
          if (t) tryApplyPastedText(t)
        }}
        onFocus={() => setPasteError(null)}
        className={cn('cursor-text', className)}
        {...rest}
      />
      {pasteError && (
        <p
          className="text-[12px] text-red-500"
          role="status"
        >
          {pasteError}
        </p>
      )}
    </div>
  )
}
