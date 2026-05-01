import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { NotificationBell } from "@/components/notification-bell"
import { prisma } from "@/lib/prisma"
import {
  Building2, LayoutDashboard, Users, FileText, Wrench, Boxes,
  FolderKanban, Receipt, Briefcase, BarChart3, Settings, LogOut,
  FileCheck, UserRound, ShieldCheck,
} from "lucide-react"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/propiedades", label: "Propiedades", icon: Building2 },
  { href: "/inquilinos", label: "Inquilinos", icon: Users },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/pagos", label: "Pagos y Facturas", icon: Receipt },
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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any
  const orgId = user.organizationId as string

  const pendingApprovals = await prisma.approvalRequest.count({
    where: { organizationId: orgId, status: { in: ["PENDING", "PENDING_COSIGN"] } },
  })

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-sidebar flex flex-col shrink-0">
        <div className="px-5 py-5 border-b">
          <div className="font-display text-lg tracking-tight">Inmobiliaria Pro</div>
          <div className="text-xs text-muted-foreground mt-0.5">{user.organizationName}</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <item.icon className="size-4 text-muted-foreground" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/autorizaciones" && pendingApprovals > 0 && (
                <span className="bg-amber-500 text-white text-xs rounded-full size-4 flex items-center justify-center font-medium">
                  {pendingApprovals > 9 ? "9+" : pendingApprovals}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors text-muted-foreground">
              <LogOut className="size-4" />
              Cerrar sesion
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b flex items-center justify-end px-4 gap-2 bg-background shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 bg-background overflow-auto">{children}</main>
      </div>
    </div>
  )
}
