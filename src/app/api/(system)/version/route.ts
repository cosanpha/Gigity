import { VERSION } from '@/constants/env.client'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ serverVersion: VERSION }, { status: 200 })
}
