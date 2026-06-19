import { createRootRoute, Outlet } from '@tanstack/react-router'
import { QueryProvider } from '@/data/QueryProvider.tsx'
import { Header } from '@/components/layout/Header.tsx'
import { Footer } from '@/components/layout/Footer.tsx'

function RootError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Алдаа гарлаа</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{message}</p>
        {stack && (
          <pre className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 overflow-auto max-h-64 mb-4">
            {stack}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium"
        >
          Дахин ачааллах
        </button>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: ({ error }) => <RootError error={error} />,
})

function RootLayout() {
  return (
    <QueryProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </QueryProvider>
  )
}
