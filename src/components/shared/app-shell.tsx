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
          bg-sidebar text-sidebar-foreground flex flex-col
          transition-transform duration-200 ease-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-0">
            <OwlMark />
            <div className="min-w-0">
              <div className="font-display text-lg tracking-[0.12em] text-[#F4EFE6] leading-tight">{brand}</div>
              {brandSubtitle && <div className="text-[10px] tracking-wider uppercase text-sidebar-foreground/55 truncate max-w-[150px]">{brandSubtitle}</div>}
            </div>
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
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium truncate text-[#F4EFE6]">{userName}</div>
            <div className="text-xs text-sidebar-foreground/55 truncate">{userEmail}</div>
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

// Búho de marca (medianoche) en oro, para el sidebar
function OwlMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 800 800" fill="none" stroke="#C9A24B" strokeWidth={14}
      strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <g transform="translate(115,0) scale(0.8)">
        <path d="M 290 400 C 276 345, 278 285, 296 232 C 305 200, 318 180, 332 182 C 339 196, 345 218, 350 240 C 367 248, 385 248, 400 244 C 415 248, 433 248, 450 240 C 455 218, 461 196, 468 182 C 482 180, 495 200, 504 232 C 522 285, 524 345, 510 400 C 548 448, 566 532, 566 626 C 566 730, 532 808, 476 850 C 444 868, 412 873, 400 873 C 388 873, 356 868, 324 850 C 268 808, 234 730, 234 626 C 234 532, 252 448, 290 400 Z"/>
        <path d="M 326 296 Q 356 308, 390 296"/><path d="M 410 296 Q 444 308, 474 296"/>
        <path d="M 397 364 L 400 388 L 403 364 Z"/>
        <path d="M 400 460 Q 398 600, 400 740 Q 400 810, 400 855"/>
      </g>
    </svg>
  )
}

export function LogoutButton() {
  return (
    <button
      type="submit"
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
    >
      <LogOut className="size-4" />
      Cerrar sesión
    </button>
  )
}
