import { extractHttpUrlsFromPromptText } from '@/lib/url-utils'

/** Same value as CLOUDINARY_CLOUD_NAME - set in .env for step 7 reference validation in the browser. */
export const CLOUDINARY_CLOUD_NAME_PUBLIC =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? ''

/** res.cloudinary.com delivery URL for raster/vector images (not video/raw). */
export function isLikelyCloudinaryImageDeliveryUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.hostname !== 'res.cloudinary.com') return false
    return /\/image\/(upload|fetch)\//.test(u.pathname)
  } catch {
    return false
  }
}

/**
 * True if URL is an image delivery URL on your Cloudinary account.
 * When NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is unset, accepts any res.cloudinary.com image/upload|fetch URL.
 */
export function isMyCloudinaryImageDeliveryUrl(url: string): boolean {
  if (!isLikelyCloudinaryImageDeliveryUrl(url)) return false
  const cloud = CLOUDINARY_CLOUD_NAME_PUBLIC
  if (!cloud) return true
  try {
    const u = new URL(url)
    return u.pathname.includes(`/${cloud}/image/`)
  } catch {
    return false
  }
}

export function extractMyCloudinaryImageRefsFromPromptText(
  text: string
): string[] {
  return extractHttpUrlsFromPromptText(text).filter(u =>
    isMyCloudinaryImageDeliveryUrl(u)
  )
}

export function partitionPromptUrlsForCloudinaryRefs(prompt: string): {
  validCloudinaryImageRefs: string[]
  otherHttpUrls: string[]
} {
  const all = extractHttpUrlsFromPromptText(prompt)
  const valid: string[] = []
  const other: string[] = []
  for (const u of all) {
    if (isMyCloudinaryImageDeliveryUrl(u)) valid.push(u)
    else other.push(u)
  }
  return { validCloudinaryImageRefs: valid, otherHttpUrls: other }
}

export function isLikelyCloudinaryVideoDeliveryUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.hostname !== 'res.cloudinary.com') return false
    return /\/video\/(upload|fetch)\//.test(u.pathname)
  } catch {
    return false
  }
}

/** Step 8: clip must be delivered as video from your Cloudinary (or any Cloudinary if public cloud name unset). */
export function isMyCloudinaryVideoDeliveryUrl(url: string): boolean {
  if (!isLikelyCloudinaryVideoDeliveryUrl(url)) return false
  const cloud = CLOUDINARY_CLOUD_NAME_PUBLIC
  if (!cloud) return true
  try {
    return new URL(url).pathname.includes(`/${cloud}/video/`)
  } catch {
    return false
  }
}
