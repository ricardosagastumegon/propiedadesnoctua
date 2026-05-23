"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LogOut } from "lucide-react"

interface AppShellProps {
  brand: string
  brandSubtitle?: string
  userName: string
  userEmail: string
  logoutForm: React.ReactNode
  sidebar: React.ReactNode
  headerExtras: React.ReactNode
  children: React.ReactNode
}

/**
 * Layout responsive:
 * - Mobile (< lg): top app bar con hamburguesa, sidebar oculto detrás de un drawer
 * - Desktop (lg+): sidebar fijo a la izquierda, header sutil arriba
 */
export function AppShell({ brand, brandSubtitle, userName, userEmail, logoutForm, sidebar, headerExtras, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar drawer al cambiar de ruta
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Bloquear scroll del body cuando el drawer está abierto en mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [drawerOpen])

  return (
    <div className="min-h-screen flex bg-background">
      {/* SIDEBAR — desktop: fijo. Mobile: drawer animado. */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40
          h-screen w-72 lg:w-64 shrink-0
          border-r bg-sidebar flex flex-col
          transition-transform duration-200 ease-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <Link href="/dashboard" className="block hover:opacity-80 transition-opacity">
            <div className="font-display text-lg tracking-tight">{brand}</div>
            {brandSubtitle && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{brandSubtitle}</div>}
          </Link>
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-2 -mr-2 hover:bg-sidebar-accent rounded-md"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {sidebar}
        </nav>
        <div className="p-3 border-t">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
          </div>
          {logoutForm}
        </div>
      </aside>

      {/* Backdrop mobile */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-12 border-b flex items-center justify-between px-3 lg:px-4 gap-3 bg-background shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-md"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
            <Link href="/dashboard" className="lg:hidden font-display text-base tracking-tight truncate">
              {brand}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {headerExtras}
          </div>
        </header>
        <main className="flex-1 bg-background overflow-auto">{children}</main>
      </div>
    </div>
  )
}

export function LogoutButton() {
  return (
    <button
      type="submit"
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors text-muted-foreground"
    >
      <LogOut className="size-4" />
      Cerrar sesión
    </button>
  )
}
