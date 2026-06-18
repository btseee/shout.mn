import { createFileRoute } from '@tanstack/react-router'
import { EntityPage } from '@/pages/EntityPage.tsx'

export const Route = createFileRoute('/entity/$id')({
  component: EntityPage,
})
