export function formatRelativeDate(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
