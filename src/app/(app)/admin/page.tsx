import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isCurrentUserPlatformAdmin } from "@/lib/platform-admin"
import { parseEnabledModules } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/page-header"
import { AdminTenants, type TenantRow } from "./_admin-tenants"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  if (!(await isCurrentUserPlatformAdmin())) redirect("/dashboard")

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, createdAt: true,
      settings: { select: { enabledModules: true } },
      _count: { select: { users: true, properties: true } },
      users: {
        orderBy: { role: "asc" },
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
      },
    },
  })

  const rows: TenantRow[] = orgs.map(o => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    createdAt: o.createdAt.toISOString(),
    users: o._count.users,
    properties: o._count.properties,
    enabledModules: parseEnabledModules(o.settings?.enabledModules),
    userList: o.users.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  }))

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Administración de Tenants"
        description={`${rows.length} organizaciones en la plataforma. Solo visible para super-admin de Noctua.`}
      />
      <AdminTenants tenants={rows} />
    </div>
  )
}
