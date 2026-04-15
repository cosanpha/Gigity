import { BrandFormData } from '@/components/BrandForm'

export function validateUrls(
  body: BrandFormData
): { error: string; field: string } | null {
  if (body.logoUrl && !/^https?:\/\//.test(body.logoUrl)) {
    return {
      error: 'logoUrl must start with http:// or https://',
      field: 'logoUrl',
    }
  }
  if (Array.isArray(body.exampleVideoUrls)) {
    for (const url of body.exampleVideoUrls) {
      if (url && !/^https?:\/\//.test(url)) {
        return {
          error: 'exampleVideoUrls must start with http:// or https://',
          field: 'exampleVideoUrls',
        }
      }
    }
  }
  if (Array.isArray(body.brandLinks)) {
    if (body.brandLinks.length > 10) {
      return {
        error: 'brandLinks supports up to 10 URLs',
        field: 'brandLinks',
      }
    }
    for (const url of body.brandLinks) {
      if (url && !/^https?:\/\//.test(url)) {
        return {
          error: 'brandLinks must start with http:// or https://',
          field: 'brandLinks',
        }
      }
      if (url && url.length > 2000) {
        return {
          error: 'brandLinks URL too long (max 2000 characters)',
          field: 'brandLinks',
        }
      }
    }
  }
  return null
}
