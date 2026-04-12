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
    for (const url of body.brandLinks) {
      if (url && !/^https?:\/\//.test(url)) {
        return {
          error: 'brandLinks must start with http:// or https://',
          field: 'brandLinks',
        }
      }
    }
  }
  return null
}
