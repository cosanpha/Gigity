'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

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
  return (
    <input
      type={type}
      readOnly
      value={value}
      placeholder={placeholder}
      onPaste={e => {
        e.preventDefault()
        onValueChange(e.clipboardData.getData('text/plain').trim())
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        const t = e.dataTransfer.getData('text/plain').trim()
        if (t) onValueChange(t)
      }}
      className={cn('cursor-text', className)}
      {...rest}
    />
  )
}
