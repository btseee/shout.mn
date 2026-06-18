import { createFileRoute } from '@tanstack/react-router'
import { SearchPage } from '@/pages/SearchPage.tsx'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})
