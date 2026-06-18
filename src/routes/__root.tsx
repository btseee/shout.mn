import { createRootRoute, Outlet } from '@tanstack/react-router'
import { QueryProvider } from '@/data/QueryProvider.tsx'
import { Header } from '@/components/layout/Header.tsx'
import { Footer } from '@/components/layout/Footer.tsx'

export const Route = createRootRoute({
  component: RootLayout,
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
