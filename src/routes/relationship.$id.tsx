import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/relationship/$id')({
  component: () => <Navigate to="/" replace />,
})
