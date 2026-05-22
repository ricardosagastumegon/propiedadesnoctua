import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrgForm } from "./_org-form"
import { AccountForm } from "./_account-form"
import { UsersManager, type UserRow, type PropertyOption } from "./users/_users-manager"

export const dynamic = "force-dynamic"

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const userId = session.user.id

  const [org, usersRaw, me, settings, properties] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      include: {
        cosignPolicy: { include: { allowedCosigners: { select: { id: true } } } },
        propertyAccess: { select: { propertyId: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        cosignPolicy: { include: { allowedCosigners: { select: { id: true, name: true } } } },
        propertyAccess: { include: { property: { select: { id: true, name: true } } } },
      },
    }),
    prisma.organizationSettings.findUnique({ where: { organizationId: orgId } }),
    prisma.property.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  if (!org || !me) redirect("/login")
  const prepaymentCap = settings?.prepaymentCapPercentage ?? 80
  const isAdmin = me.role === "OWNER" || me.role === "ADMIN"

  const users: UserRow[] = usersRaw.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    authorityPolicy: u.authorityPolicy,
    canAcceptServices: u.canAcceptServices,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    mustChangePassword: u.mustChangePassword,
    cosignAllowedIds: u.cosignPolicy?.allowedCosigners.map(c => c.id) ?? [],
    propertyIds: u.propertyAccess.map(p => p.propertyId),
  }))
  const propertyOpts: PropertyOption[] = properties

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Configuración" description="Ajustes de la organización, usuarios y tu cuenta." />

      <Tabs defaultValue={isAdmin ? "usuarios" : "cuenta"}>
        <TabsList className="mb-6">
          {isAdmin && <TabsTrigger value="org">Organización</TabsTrigger>}
          {isAdmin && <TabsTrigger value="usuarios">Usuarios ({users.filter(u => u.isActive).length})</TabsTrigger>}
          <TabsTrigger value="cuenta">Mi cuenta</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="org">
            <OrgForm org={org} prepaymentCap={prepaymentCap} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="usuarios">
            <UsersManager
              users={users}
              properties={propertyOpts}
              currentUserId={userId}
              currentUserRole={me.role}
            />
          </TabsContent>
        )}

        <TabsContent value="cuenta">
          <AccountForm
            me={me}
            cosigners={me.cosignPolicy?.allowedCosigners ?? []}
            propertyAccess={me.propertyAccess.map(p => p.property)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
