import { createFileRoute } from '@tanstack/react-router'
import { DataMethodologyPage } from '@/pages/DataMethodologyPage.tsx'

export const Route = createFileRoute('/data-methodology')({
  component: DataMethodologyPage,
})
