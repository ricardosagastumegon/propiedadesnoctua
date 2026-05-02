"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2, LayoutDashboard, Users, FileText, Wrench, Boxes,
  FolderKanban, Receipt, Briefcase, BarChart3, Settings,
  FileCheck, UserRound, ShieldCheck, Wallet,
} from "lucide-react"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/propiedades", label: "Propiedades", icon: Building2 },
  { href: "/inquilinos", label: "Inquilinos", icon: Users },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/pagos", label: "Pagos y Facturas", icon: Receipt },
  { href: "/caja-chica", label: "Caja Chica", icon: Wallet },
  { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
  { href: "/activos", label: "Activos", icon: Boxes },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/proveedores", label: "Proveedores", icon: Briefcase },
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileCheck },
  { href: "/empleados", label: "Empleados", icon: UserRound },
  { href: "/autorizaciones", label: "Autorizaciones", icon: ShieldCheck },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/configuracion", label: "Configuracion", icon: Settings },
]

export function SidebarNav({ pendingApprovals }: { pendingApprovals: number }) {
  const pathname = usePathname()

  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <Icon className={`size-4 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
            <span className="flex-1">{label}</span>
            {href === "/autorizaciones" && pendingApprovals > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full size-4 flex items-center justify-center font-medium">
                {pendingApprovals > 9 ? "9+" : pendingApprovals}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}
