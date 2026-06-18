import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/source/$id')({
  component: () => <Navigate to="/" replace />,
})
