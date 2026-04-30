import { PageHeader } from "@/components/ui/page-header"
import { TenantForm } from "../_components/tenant-form"
import { createTenant } from "../actions"

export default function NuevoInquilinoPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Nuevo inquilino" description="Registra un inquilino para asignarlo a contratos." />
      <TenantForm action={createTenant} submitLabel="Crear inquilino" />
    </div>
  )
}
