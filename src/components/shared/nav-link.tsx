"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2, LayoutDashboard, Users, FileText, Wrench, Boxes,
  FolderKanban, Receipt, Briefcase, BarChart3, Settings,
  FileCheck, UserRound, ShieldCheck, Wallet, BadgeCheck,
} from "lucide-react"
import { can, type Module, type UserForPermissions } from "@/lib/permissions"

interface NavItem {
  href: string
  label: string
  icon: typeof Building2
  module: Module
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/propiedades", label: "Propiedades", icon: Building2, module: "propiedades" },
  { href: "/inquilinos", label: "Inquilinos", icon: Users, module: "inquilinos" },
  { href: "/contratos", label: "Contratos", icon: FileText, module: "contratos" },
  { href: "/pagos", label: "Pagos y Facturas", icon: Receipt, module: "pagos" },
  { href: "/caja-chica", label: "Caja Chica", icon: Wallet, module: "cajaChica" },
  { href: "/mantenimiento", label: "Mantenimiento", icon: Wrench, module: "mantenimiento" },
  { href: "/activos", label: "Activos", icon: Boxes, module: "activos" },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban, module: "proyectos" },
  { href: "/proveedores", label: "Proveedores", icon: Briefcase, module: "proveedores" },
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileCheck, module: "cotizaciones" },
  { href: "/empleados", label: "Empleados", icon: UserRound, module: "empleados" },
  { href: "/autorizaciones", label: "Autorizaciones", icon: ShieldCheck, module: "autorizaciones" },
  { href: "/aceptaciones", label: "Aceptaciones", icon: BadgeCheck, module: "aceptaciones" },
  { href: "/reportes", label: "Reportes", icon: BarChart3, module: "reportes" },
  { href: "/configuracion", label: "Configuracion", icon: Settings, module: "configuracion" },
]

interface SidebarNavProps {
  pendingApprovals: number
  pendingAcceptances?: number
  user: UserForPermissions
}

export function SidebarNav({ pendingApprovals, pendingAcceptances = 0, user }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <>
      {NAV.map(({ href, label, icon: Icon, module }) => {
        if (!can(user, module, "view")) return null
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
