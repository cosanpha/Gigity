'use client'

import { BrandForm, BrandFormData } from '@/components/BrandForm'
import { Navbar } from '@/components/Navbar'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { apiFetch } from '@/lib/api-fetch'
import { LucideTrash2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BrandEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [initialData, setInitialData] = useState<BrandFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    apiFetch(`/api/v1/brand/${id}`)
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
    const res = await apiFetch(`/api/v1/brand/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push(`/?brand=${encodeURIComponent(String(id))}`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!initialData) return
    setDeleting(true)
    setDeleteError(null)
    const res = await apiFetch(`/api/v1/brand/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteDialogOpen(false)
      router.push('/')
      return
    }
    const body = await res.json().catch(() => ({}))
    setDeleting(false)
    setDeleteError(
      typeof body.error === 'string'
        ? body.error
        : 'Could not delete brand - try again'
    )
  }

  if (!initialData) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-[640px] px-6 py-10 pb-20">
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
      <main className="mx-auto max-w-[640px] px-6 py-10 pb-20">
        <div className="mb-8 flex items-center gap-3">
          <div>
            <h1 className="mb-1 text-[20px] font-bold tracking-tight text-zinc-950">
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

        <div className="mt-10 border-t border-zinc-200 pt-8">
          <SectionHeader label="Danger zone" />
          <p className="mb-4 max-w-[520px] text-[13px] leading-relaxed text-zinc-500">
            Permanently delete this brand. You can only delete a brand that has
            no video projects yet.
          </p>
          {deleteError && (
            <div className="mb-4 rounded-[6px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {deleteError}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setDeleteError(null)
              setDeleteDialogOpen(true)
            }}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-[6px] border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LucideTrash2
              className="h-4 w-4"
              aria-hidden
            />
            Delete brand
          </button>
        </div>
      </main>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={next => {
          if (deleting && !next) return
          setDeleteDialogOpen(next)
          if (!next) setDeleteError(null)
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this brand?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-zinc-500">
                <p>
                  This will permanently delete{' '}
                  <span className="font-medium text-zinc-800">
                    {initialData.name}
                  </span>
                  . This cannot be undone.
                </p>
                <p>
                  Brands with existing video projects cannot be deleted until
                  those projects are removed or reassigned.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting…' : 'Delete brand'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
