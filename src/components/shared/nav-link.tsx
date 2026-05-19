"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2, LayoutDashboard, Users, FileText, Wrench, Boxes,
  FolderKanban, Receipt, Briefcase, BarChart3, Settings,
  FileCheck, UserRound, ShieldCheck, Wallet, BadgeCheck,
} from "lucide-react"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresAcceptance: false },
  { href: "/propiedades", label: "Propiedades", icon: Building2, requiresAcceptance: false },
  { href: "/inquilinos", label: "Inquilinos", icon: Users, requiresAcceptance: false },
  { href: "/contratos", label: "Contratos", icon: FileText, requiresAcceptance: false },
  { href: "/pagos", label: "Pagos y Facturas", icon: Receipt, requiresAcceptance: false },
  { href: "/caja-chica", label: "Caja Chica", icon: Wallet, requiresAcceptance: false },
  { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench, requiresAcceptance: false },
  { href: "/activos", label: "Activos", icon: Boxes, requiresAcceptance: false },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban, requiresAcceptance: false },
  { href: "/proveedores", label: "Proveedores", icon: Briefcase, requiresAcceptance: false },
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileCheck, requiresAcceptance: false },
  { href: "/empleados", label: "Empleados", icon: UserRound, requiresAcceptance: false },
  { href: "/autorizaciones", label: "Autorizaciones", icon: ShieldCheck, requiresAcceptance: false },
  { href: "/aceptaciones", label: "Aceptaciones", icon: BadgeCheck, requiresAcceptance: true },
  { href: "/reportes", label: "Reportes", icon: BarChart3, requiresAcceptance: false },
  { href: "/configuracion", label: "Configuracion", icon: Settings, requiresAcceptance: false },
]

interface SidebarNavProps {
  pendingApprovals: number
  pendingAcceptances?: number
  canAcceptServices?: boolean
  role?: string
}

export function SidebarNav({ pendingApprovals, pendingAcceptances = 0, canAcceptServices = false, role = "VIEWER" }: SidebarNavProps) {
  const pathname = usePathname()
  const isOwnerOrAdmin = role === "ADMIN" || role === "OWNER"
  const showAcceptance = canAcceptServices || isOwnerOrAdmin

  return (
    <>
      {NAV.map(({ href, label, icon: Icon, requiresAcceptance }) => {
        if (requiresAcceptance && !showAcceptance) return null
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
            {href === "/aceptaciones" && pendingAcceptances > 0 && (
              <span className="bg-emerald-500 text-white text-xs rounded-full size-4 flex items-center justify-center font-medium">
                {pendingAcceptances > 9 ? "9+" : pendingAcceptances}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}
