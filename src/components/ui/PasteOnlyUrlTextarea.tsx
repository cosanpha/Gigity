'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

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
  return (
    <textarea
      readOnly
      value={value}
      onPaste={e => {
        e.preventDefault()
        onValueChange(e.clipboardData.getData('text/plain'))
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        const t = e.dataTransfer.getData('text/plain')
        if (t) onValueChange(t)
      }}
      className={cn('cursor-text', className)}
      {...rest}
    />
  )
}
