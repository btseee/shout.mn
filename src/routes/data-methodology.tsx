import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/data-methodology')({
  component: () => <Navigate to="/" replace />,
})
