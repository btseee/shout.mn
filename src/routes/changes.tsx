import { createFileRoute } from '@tanstack/react-router'
import { ChangesPage } from '@/pages/ChangesPage.tsx'

export const Route = createFileRoute('/changes')({
  component: ChangesPage,
})
