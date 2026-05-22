import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatGTQ, formatDate } from "@/lib/format"
import { DOCUMENT_TYPES } from "@/lib/schemas/tenant"
import { Pencil, Phone, Mail, User, FileText } from "lucide-react"
import { DeleteTenantButton } from "./_delete-button"

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const tenant = await prisma.tenant.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contracts: {
        include: { property: true, unit: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })
  if (!tenant) notFound()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={tenant.fullName}
        description={`${DOCUMENT_TYPES[tenant.documentType] ?? tenant.documentType}: ${tenant.documentNumber}`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/inquilinos/${id}/editar`}><Pencil className="size-4 mr-1" />Editar</Link>
        </Button>
        <DeleteTenantButton id={id} />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Datos personales</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="size-3.5 text-muted-foreground" />
              <span>{tenant.type === "COMPANY" ? "Empresa" : "Individual"}</span>
            </div>
            {tenant.occupation && <div><span className="text-muted-foreground">Ocupacion: </span>{tenant.occupation}</div>}
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Contacto</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" />{tenant.phone}</div>
            {tenant.alternatePhone && <div className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" />{tenant.alternatePhone}</div>}
            {tenant.email && <div className="flex items-center gap-2"><Mail className="size-3.5 text-muted-foreground" />{tenant.email}</div>}
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Emergencia</h3>
          <dl className="space-y-2 text-sm">
            {tenant.emergencyContact ? (
              <>
                <div>{tenant.emergencyContact}</div>
                {tenant.emergencyPhone && <div className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" />{tenant.emergencyPhone}</div>}
              </>
            ) : (
              <p className="text-muted-foreground">No registrado</p>
            )}
          </dl>
        </Card>
      </div>

      {/* Contracts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Contratos</h2>
          <Button asChild size="sm">
            <Link href={`/contratos/nuevo?tenantId=${id}`}><FileText className="size-4 mr-1" />Nuevo contrato</Link>
          </Button>
        </div>
        {tenant.contracts.length === 0 ? (
          <EmptyState icon={FileText} title="Sin contratos" description="Este inquilino no tiene contratos registrados." />
        ) : (
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N. Contrato</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Renta mensual</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.contractNumber}</TableCell>
                    <TableCell>{c.property.name}{c.unit ? ` · Unidad ${c.unit.unitNumber}` : ""}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.startDate)} — {formatDate(c.endDate)}
                    </TableCell>
                    <TableCell>{formatGTQ(c.monthlyRent)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/contratos/${c.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
