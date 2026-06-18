import type { Entity } from '@/types/entity.ts'
import type { Relationship } from '@/types/relationship.ts'

export function exportEntityJson(entity: Entity): void {
  const blob = new Blob([JSON.stringify(entity, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `entity-${entity.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportRelationshipJson(rel: Relationship): void {
  const blob = new Blob([JSON.stringify(rel, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relationship-${rel.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
