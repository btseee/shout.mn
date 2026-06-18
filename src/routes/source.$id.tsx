import { createFileRoute } from '@tanstack/react-router'
import { SourcePage } from '@/pages/SourcePage.tsx'

export const Route = createFileRoute('/source/$id')({
  component: SourcePage,
})
