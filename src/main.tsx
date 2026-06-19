import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen.ts'
import './index.css'

function DefaultError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Алдаа гарлаа</h1>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        {stack && (
          <pre className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded p-4 overflow-auto max-h-64 mb-4">
            {stack}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium"
        >
          Дахин ачааллах
        </button>
      </div>
    </div>
  )
}

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultErrorComponent: ({ error }) => <DefaultError error={error} />,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
