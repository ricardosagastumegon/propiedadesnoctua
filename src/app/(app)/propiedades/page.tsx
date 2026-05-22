import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Bed, Bath, Maximize } from "lucide-react"
import { formatGTQ } from "@/lib/format"

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  CHALET: "Chalet",
  COMMERCIAL: "Comercial",
  OFFICE: "Oficina",
  WAREHOUSE: "Bodega",
  BUILDING: "Edificio",
  LAND: "Terreno",
  VACATION: "Vacacional",
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RENTED: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-gray-100 text-gray-600",
  FOR_SALE: "bg-purple-100 text-purple-800",
  SOLD: "bg-gray-200 text-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  RENTED: "Arrendada",
  MAINTENANCE: "Mantenimiento",
  INACTIVE: "Inactiva",
  FOR_SALE: "En venta",
  SOLD: "Vendida",
}

export default async function PropertiesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const properties = await prisma.property.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Propiedades</h1>
          <p className="text-sm text-muted-foreground mt-1">{properties.length} en el portafolio.</p>
        </div>
        <Button asChild>
          <Link href="/propiedades/nueva">
            <Plus className="size-4" />
            Nueva propiedad
          </Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="text-muted-foreground">No hay propiedades aun.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Link key={p.id} href={`/propiedades/${p.id}`}>
              <Card className="p-0 overflow-hidden hover:border-foreground/20 transition-colors cursor-pointer h-full">
                <div className="aspect-[16/10] bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  {p.coverImageUrl ? (
                    <img src={p.coverImageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    "Sin foto"
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className="font-display text-lg leading-tight">{p.name}</h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {TYPE_LABELS[p.type] ?? p.type}
                      </Badge>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                    <MapPin className="size-3" />
                    {p.zone ? `${p.zone}, ` : ""}
                    {p.city}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {p.bedrooms != null && (
                      <span className="flex items-center gap-1">
                        <Bed className="size-3" />
                        {p.bedrooms}
                      </span>
                    )}
                    {p.bathrooms != null && (
                      <span className="flex items-center gap-1">
                        <Bath className="size-3" />
                        {p.bathrooms}
                      </span>
                    )}
                    {p.builtArea != null && (
                      <span className="flex items-center gap-1">
                        <Maximize className="size-3" />
                        {p.builtArea} m2
                      </span>
                    )}
                  </div>
                  {p.currentValue != null && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-xs text-muted-foreground">Valor actual</div>
                      <div className="font-display text-lg tabular-nums">
                        {formatGTQ(p.currentValue)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}