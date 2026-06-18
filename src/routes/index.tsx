import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/pages/LandingPage.tsx'

export const Route = createFileRoute('/')({
  component: LandingPage,
})
