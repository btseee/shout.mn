import { createFileRoute } from '@tanstack/react-router'
import { RelationshipPage } from '@/pages/RelationshipPage.tsx'

export const Route = createFileRoute('/relationship/$id')({
  component: RelationshipPage,
})
