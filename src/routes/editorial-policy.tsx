import { createFileRoute } from '@tanstack/react-router'
import { EditorialPolicyPage } from '@/pages/EditorialPolicyPage.tsx'

export const Route = createFileRoute('/editorial-policy')({
  component: EditorialPolicyPage,
})
