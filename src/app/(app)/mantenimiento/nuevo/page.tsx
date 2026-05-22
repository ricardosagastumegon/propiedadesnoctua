import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { TicketForm } from "../_components/ticket-form"
import { createTicket } from "../actions"

export default async function NuevoTicketPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const sp = await searchParams

  const properties = await prisma.property.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Nuevo ticket" description="Reporta un problema o trabajo de mantenimiento." />
      <TicketForm properties={properties} defaultPropertyId={sp.propertyId} action={createTicket} />
    </div>
  )
}
