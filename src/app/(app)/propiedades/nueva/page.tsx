import { PageHeader } from "@/components/ui/page-header"
import { PropertyForm } from "../_components/property-form"
import { createProperty } from "../actions"

export default function NuevaPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Nueva propiedad" description="Registra una propiedad en tu portafolio." />
      <PropertyForm action={createProperty} submitLabel="Crear propiedad" />
    </div>
  )
}
