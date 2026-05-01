import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { formatGTQ, formatDate } from "@/lib/format"
import { PROPERTY_TYPES, PROPERTY_STATUSES } from "@/lib/schemas/property"
import { MapPin, Pencil, Plus, Building2, FileText, Wrench, Boxes, FolderKanban, Zap } from "lucide-react"
import { DeletePropertyButton } from "./_delete-button"

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const property = await prisma.property.findFirst({
    where: { id, organizationId: orgId },
    include: {
      units: true,
      contracts: { include: { tenant: true }, orderBy: { createdAt: "desc" }, take: 10 },
      maintenances: { orderBy: { createdAt: "desc" }, take: 10 },
      assets: { orderBy: { createdAt: "desc" }, take: 10 },
      projects: { orderBy: { createdAt: "desc" }, take: 10 },
      utilities: { include: { bills: { orderBy: { dueDate: "desc" }, take: 1 } } },
    },
  })
  if (!property) notFound()

  const statusLabel = PROPERTY_STATUSES[property.status] ?? property.status
  const typeLabel = PROPERTY_TYPES[property.type] ?? property.type

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-4">
          {property.coverImageUrl ? (
            <img src={property.coverImageUrl} alt={property.name} className="w-24 h-20 rounded-xl object-cover border shrink-0" />
          ) : (
            <div className="w-24 h-20 rounded-xl border bg-muted flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{typeLabel}</Badge>
              <Badge variant={property.status === "RENTED" ? "default" : "outline"}>{statusLabel}</Badge>
            </div>
            <h1 className="font-display text-3xl tracking-tight">{property.name}</h1>
            {property.alias && <p className="text-sm text-muted-foreground">{property.alias}</p>}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="size-3.5" />
              {property.zone ? `${property.zone}, ` : ""}{property.city}, {property.department}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/propiedades/${id}/editar`}><Pencil className="size-4 mr-1" />Editar</Link>
          </Button>
          <DeletePropertyButton id={id} />
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-6">
          <TabsTrigger value="info">Informacion</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({property.contracts.length})</TabsTrigger>
          <TabsTrigger value="mantenimiento">Mantenimiento ({property.maintenances.length})</TabsTrigger>
          <TabsTrigger value="activos">Activos ({property.assets.length})</TabsTrigger>
          <TabsTrigger value="proyectos">Proyectos ({property.projects.length})</TabsTrigger>
          <TabsTrigger value="servicios">Servicios publicos ({property.utilities.length})</TabsTrigger>
        </TabsList>

        {/* INFO */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-5 col-span-full md:col-span-1">
              <h3 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">Ubicacion</h3>
              <p className="text-sm">{property.addressLine}</p>
              {property.zone && <p className="text-sm">{property.zone}</p>}
              <p className="text-sm">{property.city}, {property.department}</p>
              <p className="text-sm">{property.country}</p>
            </Card>
            <Card className="p-5">
              <h3 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">Caracteristicas</h3>
              <dl className="space-y-1 text-sm">
                {property.bedrooms != null && <div className="flex justify-between"><dt className="text-muted-foreground">Habitaciones</dt><dd>{property.bedrooms}</dd></div>}
                {property.bathrooms != null && <div className="flex justify-between"><dt className="text-muted-foreground">Banos</dt><dd>{property.bathrooms}</dd></div>}
                {property.parkingSpaces != null && <div className="flex justify-between"><dt className="text-muted-foreground">Parqueos</dt><dd>{property.parkingSpaces}</dd></div>}
                {property.builtArea != null && <div className="flex justify-between"><dt className="text-muted-foreground">Area construida</dt><dd>{property.builtArea} m2</dd></div>}
                {property.totalArea != null && <div className="flex justify-between"><dt className="text-muted-foreground">Area total</dt><dd>{property.totalArea} m2</dd></div>}
                {property.yearBuilt != null && <div className="flex justify-between"><dt className="text-muted-foreground">Ano construccion</dt><dd>{property.yearBuilt}</dd></div>}
              </dl>
            </Card>
            <Card className="p-5">
              <h3 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">Financiero</h3>
              <dl className="space-y-1 text-sm">
                {property.acquisitionDate && <div className="flex justify-between"><dt className="text-muted-foreground">Adquisicion</dt><dd>{formatDate(property.acquisitionDate)}</dd></div>}
                {property.acquisitionCost != null && <div className="flex justify-between"><dt className="text-muted-foreground">Costo adq.</dt><dd>{formatGTQ(property.acquisitionCost)}</dd></div>}
                {property.currentValue != null && <div className="flex justify-between"><dt className="text-muted-foreground">Valor actual</dt><dd className="font-medium">{formatGTQ(property.currentValue)}</dd></div>}
                {property.propertyTaxYear != null && <div className="flex justify-between"><dt className="text-muted-foreground">IUSI anual</dt><dd>{formatGTQ(property.propertyTaxYear)}</dd></div>}
              </dl>
            </Card>
            {property.notes && (
              <Card className="p-5 col-span-full">
                <h3 className="font-medium text-sm mb-2 text-muted-foreground uppercase tracking-wider">Notas</h3>
                <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* CONTRATOS */}
        <TabsContent value="contratos">
          <div className="flex justify-end mb-4">
            <Button asChild size="sm">
              <Link href={`/contratos/nuevo?propertyId=${id}`}><Plus className="size-4 mr-1" />Nuevo contrato</Link>
            </Button>
          </div>
          {property.contracts.length === 0 ? (
            <EmptyState icon={FileText} title="Sin contratos" description="Esta propiedad no tiene contratos registrados." />
          ) : (
            <div className="space-y-2">
              {property.contracts.map((c) => (
                <Link key={c.id} href={`/contratos/${c.id}`}>
                  <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{c.contractNumber}</p>
                        <p className="text-xs text-muted-foreground">{c.tenant.fullName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{formatGTQ(c.monthlyRent)}/mes</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MANTENIMIENTO */}
        <TabsContent value="mantenimiento">
          <div className="flex justify-end mb-4">
            <Button asChild size="sm">
              <Link href={`/mantenimiento/nuevo?propertyId=${id}`}><Plus className="size-4 mr-1" />Nuevo ticket</Link>
            </Button>
          </div>
          {property.maintenances.length === 0 ? (
            <EmptyState icon={Wrench} title="Sin tickets" description="No hay tickets de mantenimiento para esta propiedad." />
          ) : (
            <div className="space-y-2">
              {property.maintenances.map((m) => (
                <Link key={m.id} href={`/mantenimiento/${m.id}`}>
                  <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{m.ticketNumber} — {m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.category} · {m.priority}</p>
                      </div>
                      <Badge variant="secondary">{m.status}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACTIVOS */}
        <TabsContent value="activos">
          <div className="flex justify-end mb-4">
            <Button asChild size="sm">
              <Link href={`/activos/nuevo?propertyId=${id}`}><Plus className="size-4 mr-1" />Nuevo activo</Link>
            </Button>
          </div>
          {property.assets.length === 0 ? (
            <EmptyState icon={Boxes} title="Sin activos" description="No hay activos registrados para esta propiedad." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {property.assets.map((a) => (
                <Link key={a.id} href={`/activos/${a.id}`}>
                  <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer">
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.category} · {a.status}</p>
                    {a.currentValue != null && <p className="text-sm mt-1">{formatGTQ(a.currentValue)}</p>}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PROYECTOS */}
        <TabsContent value="proyectos">
          <div className="flex justify-end mb-4">
            <Button asChild size="sm">
              <Link href={`/proyectos/nuevo?propertyId=${id}`}><Plus className="size-4 mr-1" />Nuevo proyecto</Link>
            </Button>
          </div>
          {property.projects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="Sin proyectos" description="No hay proyectos vinculados a esta propiedad." />
          ) : (
            <div className="space-y-2">
              {property.projects.map((p) => (
                <Link key={p.id} href={`/proyectos/${p.id}`}>
                  <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.type} · {p.progressPercent}% completado</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{p.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{p.budgetEstimate != null ? formatGTQ(p.budgetEstimate) : ""}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SERVICIOS */}
        <TabsContent value="servicios">
          <div className="flex justify-end mb-4">
            <Button asChild size="sm">
              <Link href={`/propiedades/${id}/servicios/nuevo`}><Plus className="size-4 mr-1" />Agregar servicio</Link>
            </Button>
          </div>
          {property.utilities.length === 0 ? (
            <EmptyState icon={Zap} title="Sin servicios" description="No hay cuentas de servicios publicos registradas." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {property.utilities.map((u) => {
                const lastBill = u.bills[0]
                return (
                  <Card key={u.id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{u.type} — {u.provider}</p>
                      <Badge variant={lastBill?.isPaid ? "default" : "secondary"}>{lastBill?.isPaid ? "Al dia" : "Pendiente"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Cuenta: {u.accountNumber}</p>
                    {lastBill && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ultimo recibo: {formatGTQ(lastBill.amount)} · vence {formatDate(lastBill.dueDate)}
                      </p>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
