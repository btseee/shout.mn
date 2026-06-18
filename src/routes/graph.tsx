import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/graph')({
  component: () => <Navigate to="/" replace />,
})
