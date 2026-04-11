'use client'

import { BrandForm, BrandFormData } from '@/components/BrandForm'
import { Navbar } from '@/components/Navbar'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BrandEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [initialData, setInitialData] = useState<BrandFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/brand/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then(setInitialData)
      .catch(() => router.push('/'))
  }, [id, router])

  async function handleSave(data: BrandFormData) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/v1/brand/${id}`, {
      method: 'PUT',
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

  if (!initialData) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-[780px] px-6 py-10">
          <p className="text-sm text-zinc-500">Loading...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar
        brandName={initialData.name}
        brandId={id}
      />
      <main className="mx-auto max-w-[780px] px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div>
            <h1 className="mb-1 text-xl font-semibold tracking-tight">
              Edit brand
            </h1>
            <p className="text-[13px] text-zinc-500">
              Changes apply to all future workflow steps.
            </p>
          </div>
        </div>
        {error && (
          <div className="mb-6 rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <BrandForm
          initialData={initialData}
          onSave={handleSave}
          saving={saving}
        />
      </main>
    </>
  )
}
