export function formatDate(dateStr: string): string {
  if (!dateStr) return 'Unknown'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatDateRange(start: string, end: string): string {
  const s = start ? formatDateShort(start) : 'Unknown'
  const e = end ? formatDateShort(end) : 'Present'
  return `${s} – ${e}`
}

export function formatConfidence(confidence: number): string {
  if (confidence >= 90) return 'High'
  if (confidence >= 70) return 'Medium-High'
  if (confidence >= 50) return 'Medium'
  if (confidence >= 30) return 'Low-Medium'
  return 'Low'
}

export function formatStrength(strength: number): string {
  if (strength >= 90) return 'Very Strong'
  if (strength >= 70) return 'Strong'
  if (strength >= 50) return 'Moderate'
  if (strength >= 30) return 'Weak'
  return 'Very Weak'
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
