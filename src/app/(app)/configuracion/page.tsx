import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrgForm } from "./_org-form"
import { AccountForm } from "./_account-form"
import { UsersPanel } from "./_users-panel"

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const userId = session.user.id

  const [org, users, me, settings] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, authorityPolicy: true, isActive: true, canAcceptServices: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.organizationSettings.findUnique({ where: { organizationId: orgId } }),
  ])

  if (!org || !me) redirect("/login")
  const prepaymentCap = settings?.prepaymentCapPercentage ?? 80

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Configuracion" description="Ajustes de la organizacion y tu cuenta." />

      <Tabs defaultValue="org">
        <TabsList className="mb-6">
          <TabsTrigger value="org">Organizacion</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios ({users.length})</TabsTrigger>
          <TabsTrigger value="cuenta">Mi cuenta</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <OrgForm org={org} prepaymentCap={prepaymentCap} />
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersPanel users={users} currentUserId={userId} currentUserRole={me.role} />
        </TabsContent>

        <TabsContent value="cuenta">
          <AccountForm me={me} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
