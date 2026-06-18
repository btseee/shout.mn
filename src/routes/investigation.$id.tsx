import { createFileRoute } from '@tanstack/react-router'
import { InvestigationPage } from '@/pages/InvestigationPage.tsx'

export const Route = createFileRoute('/investigation/$id')({
  component: InvestigationPage,
})
