import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatGTQ } from "@/lib/format"
import { QUOTE_STATUSES, QUOTE_STATUS_COLORS } from "@/lib/schemas/vendor"
import { FileText, Plus } from "lucide-react"

export default async function CotizacionesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const quotes = await prisma.quote.findMany({
    where: { organizationId: orgId },
    include: { vendor: true, project: true, partida: { select: { name: true } } },
    orderBy: { date: "desc" },
  })

  const pending = quotes.filter(q => q.status === "PENDING")
  const approved = quotes.filter(q => q.status === "APPROVED")
  const totalApproved = approved.reduce((s, q) => s + q.total, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Cotizaciones" description={`${pending.length} pendientes · ${quotes.length} total`}>
        <Button asChild>
          <Link href="/cotizaciones/nueva"><Plus className="size-4 mr-1" />Nueva cotizacion</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pendientes</p>
          <p className="font-display text-2xl tabular-nums">{pending.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Aprobadas</p>
          <p className="font-display text-2xl tabular-nums">{approved.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total aprobado</p>
          <p className="font-display text-2xl tabular-nums">{formatGTQ(totalApproved)}</p>
        </Card>
      </div>

      {quotes.length === 0 ? (
        <Card><EmptyState icon={FileText} title="Sin cotizaciones" description="Crea la primera cotizacion." action={{ label: "Nueva cotizacion", href: "/cotizaciones/nueva" }} /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Proyecto / Partida</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Valida hasta</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map(q => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/cotizaciones/${q.id}`} className="font-mono text-sm hover:underline">{q.quoteNumber}</Link>
                  </TableCell>
                  <TableCell>{q.vendor.name}</TableCell>
                  <TableCell>
                    <span className="text-sm">{q.project?.name ?? "—"}</span>
                    {q.partida && (
                      <span className="block text-xs text-muted-foreground">{q.partida.name}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(q.date)}</TableCell>
                  <TableCell>{q.validUntil ? formatDate(q.validUntil) : "—"}</TableCell>
                  <TableCell className="tabular-nums font-medium">{formatGTQ(q.total)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QUOTE_STATUS_COLORS[q.status]}`}>
                      {QUOTE_STATUSES[q.status]}
                    </span>
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
