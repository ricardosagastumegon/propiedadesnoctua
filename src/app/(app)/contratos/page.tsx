import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatGTQ, formatDate } from "@/lib/format"
import { getContractStatus, STATUS_LABELS, STATUS_VARIANTS } from "@/lib/contracts"
import { FileText, Plus } from "lucide-react"

export default async function ContratosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const contracts = await prisma.contract.findMany({
    where: { organizationId: orgId },
    include: { property: true, tenant: true, unit: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Contratos" description={`${contracts.length} contratos registrados`}>
        <Button asChild>
          <Link href="/contratos/nuevo"><Plus className="size-4 mr-1" />Nuevo contrato</Link>
        </Button>
      </PageHeader>

      {contracts.length === 0 ? (
        <Card><EmptyState icon={FileText} title="Sin contratos" description="Crea tu primer contrato vinculando una propiedad con un inquilino." action={{ label: "Nuevo contrato", href: "/contratos/nuevo" }} /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N. Contrato</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Renta mensual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => {
                const displayStatus = getContractStatus(c)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.contractNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{c.property.name}</div>
                      {c.unit && <div className="text-xs text-muted-foreground">Unidad {c.unit.unitNumber}</div>}
                    </TableCell>
                    <TableCell>{c.tenant.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(c.startDate)} — {formatDate(c.endDate)}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatGTQ(c.monthlyRent)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[displayStatus]}>{STATUS_LABELS[displayStatus]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/contratos/${c.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
