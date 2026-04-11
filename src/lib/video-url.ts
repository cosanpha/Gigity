/** Client-side check: URL looks like a video resource (file extension or Cloudinary video delivery). */
export function isProbablyVideoHttpUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (
      u.hostname === 'res.cloudinary.com' &&
      u.pathname.includes('/video/upload/')
    ) {
      return true
    }
    if (
      u.hostname === 'res.cloudinary.com' &&
      u.pathname.includes('/video/fetch/')
    ) {
      return true
    }
    const pathAndQuery = `${u.pathname}${u.search}`.toLowerCase()
    if (/\.(mp4|webm|mov|m4v|mkv|mpeg|mpg|ogv)(\?|#|&|$)/i.test(pathAndQuery)) {
      return true
    }
    if (
      /[?&]format=(mp4|webm|mov|m4v)(\?|&|$)/i.test(u.search) ||
      /[?&]type=video/i.test(u.search)
    ) {
      return true
    }
    return false
  } catch {
    return false
  }
}
