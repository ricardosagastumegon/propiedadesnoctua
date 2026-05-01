import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { QuoteForm } from "../_components/quote-form"
import { createQuote } from "../actions"

export default async function NuevaCotizacionPage({ searchParams }: { searchParams: Promise<{ vendorId?: string; projectId?: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const sp = await searchParams

  const [vendors, projects] = await Promise.all([
    prisma.vendor.findMany({ where: { organizationId: orgId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Nueva cotizacion" description="Registra una cotizacion de proveedor." />
      <QuoteForm
        vendors={vendors}
        projects={projects}
        defaultVendorId={sp.vendorId}
        defaultProjectId={sp.projectId}
        action={createQuote}
      />
    </div>
  )
}
