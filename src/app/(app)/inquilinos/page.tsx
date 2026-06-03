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
import { getAccessiblePropertyIds } from "@/lib/permissions"
import { Users, Plus, Phone, Mail } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function InquilinosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const accessibleIds = await getAccessiblePropertyIds({
    id: session.user.id, role: session.user.role, organizationId: orgId,
  })

  const tenants = await prisma.tenant.findMany({
    where: {
      organizationId: orgId,
      // Tenant no tiene propertyId directo: filtramos por contratos en propiedades accesibles
      ...(accessibleIds !== null ? {
        contracts: { some: { propertyId: { in: accessibleIds } } },
      } : {}),
    },
    include: {
      contracts: { where: { status: "ACTIVE" }, select: { id: true } },
    },
    orderBy: { fullName: "asc" },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Inquilinos" description={`${tenants.length} inquilinos registrados`}>
        <Button asChild>
          <Link href="/inquilinos/nuevo"><Plus className="size-4 mr-1" />Nuevo inquilino</Link>
        </Button>
      </PageHeader>

      {tenants.length === 0 ? (
        <Card className="p-0">
          <EmptyState icon={Users} title="Sin inquilinos" description="Registra tu primer inquilino para asignarlo a un contrato." action={{ label: "Nuevo inquilino", href: "/inquilinos/nuevo" }} />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contratos activos</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.fullName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span className="font-mono">{t.documentType}: {t.documentNumber}</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />{t.phone}
                      </div>
                      {t.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3" />{t.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.type === "COMPANY" ? "Empresa" : "Individual"}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums text-sm">{t.contracts.length}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/inquilinos/${t.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
