'use client'

import { isHttpOrHttpsUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import * as React from 'react'

const INVALID_PASTE_MSG =
  'Paste a full URL starting with http:// or https:// (plain text is not accepted).'

export function PasteOnlyUrlInput({
  className,
  value,
  onValueChange,
  placeholder,
  type = 'text',
  ...rest
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'url'
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'onChange'
  | 'readOnly'
  | 'onPaste'
  | 'onDrop'
  | 'onDragOver'
  | 'type'
>) {
  const [pasteError, setPasteError] = React.useState<string | null>(null)

  function tryApplyPastedText(raw: string) {
    const t = raw.trim()
    setPasteError(null)
    if (t === '') {
      onValueChange('')
      return
    }
    if (!isHttpOrHttpsUrl(t)) {
      setPasteError(INVALID_PASTE_MSG)
      return
    }
    onValueChange(t)
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <input
        type={type}
        readOnly
        value={value}
        placeholder={placeholder}
        onPaste={e => {
          e.preventDefault()
          tryApplyPastedText(e.clipboardData.getData('text/plain'))
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const t = e.dataTransfer.getData('text/plain').trim()
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
