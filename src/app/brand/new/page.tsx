'use client'

import { BrandForm, BrandFormData } from '@/components/BrandForm'
import { apiFetch } from '@/lib/api-fetch'
import { Navbar } from '@/components/Navbar'
import { LucideArrowLeft } from 'lucide-react'
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
    const res = await apiFetch('/api/v1/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const profile = (await res.json()) as { _id?: string }
      const newId = profile._id?.trim()
      router.push(
        newId ? `/?brand=${encodeURIComponent(newId)}` : '/'
      )
    } else {
      const body = await res.json()
      setError(body.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-[640px] bg-zinc-50 px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] text-zinc-400 transition-colors hover:text-zinc-700"
          >
            <LucideArrowLeft
              className="h-3.5 w-3.5"
              aria-hidden
            />
            Back
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
