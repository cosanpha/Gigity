// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateUrls(body: any): { error: string; field: string } | null {
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
  return null
}
