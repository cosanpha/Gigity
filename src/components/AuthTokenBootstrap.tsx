'use client'

import { GIGITY_API_TOKEN_STORAGE_KEY } from '@/lib/api-fetch'
import { useEffect } from 'react'

export function AuthTokenBootstrap() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('token')?.trim()
    if (!token) return
    sessionStorage.setItem(GIGITY_API_TOKEN_STORAGE_KEY, token)
    url.searchParams.delete('token')
    const search = url.searchParams.toString()
    const next = url.pathname + (search ? `?${search}` : '') + url.hash
    window.history.replaceState(null, '', next)
  }, [])
  return null
}
