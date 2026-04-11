'use client'

import { BrandForm, BrandFormData } from '@/components/BrandForm'
import { Navbar } from '@/components/Navbar'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function BrandNewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(data: BrandFormData) {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/v1/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push('/')
    } else {
      const body = await res.json()
      setError(body.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[780px] px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="text-[13px] text-zinc-400 hover:text-zinc-600"
          >
            ← Back
          </Link>
        </div>
        <h1 className="mb-1 text-xl font-semibold tracking-tight">
          Set up your brand
        </h1>
        <p className="mb-8 text-[13px] text-zinc-500">
          This context is used to pre-fill every step of the video workflow.
        </p>
        {error && (
          <div className="mb-6 rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <BrandForm
          onSave={handleSave}
          saving={saving}
        />
      </main>
    </>
  )
}
