import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { can } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/page-header"
import { CandidateForm } from "../_candidate-form"

export const dynamic = "force-dynamic"

export default async function NuevaCandidataPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = { id: session.user.id, role: session.user.role, organizationId: session.user.organizationId }
  if (!can(user, "adquisiciones", "edit")) redirect("/adquisiciones")

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Agregar propiedad" description="Cargá una propiedad manualmente en Adquisiciones para analizarla." />
      <div className="mt-4"><CandidateForm /></div>
    </div>
  )
}
