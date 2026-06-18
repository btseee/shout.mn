import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/entity/$id')({
  component: () => <Navigate to="/" replace />,
})
