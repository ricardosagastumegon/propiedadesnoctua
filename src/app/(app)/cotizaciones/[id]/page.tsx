import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatGTQ } from "@/lib/format"
import { VENDOR_CATEGORIES, QUOTE_STATUSES, QUOTE_STATUS_COLORS } from "@/lib/schemas/vendor"
import { QuoteStatusActions } from "./_status-actions"
import { QuoteItemsSection } from "./_items"
import { DeleteQuoteButton } from "./_delete-button"
import { getAccessiblePropertyIds } from "@/lib/permissions"

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const { id } = await params

  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: orgId },
    include: {
      vendor: true, project: true, items: true,
      partida: { include: { project: { select: { propertyId: true } } } },
      ticket: { select: { propertyId: true } },
    },
  })
  if (!quote) notFound()

  // Validar acceso por propiedad (polimórfico): partida.project.propertyId | ticket.propertyId | project.propertyId
  const accessibleIds = await getAccessiblePropertyIds({
    id: session.user.id, role: session.user.role, organizationId: orgId,
  })
  if (accessibleIds !== null) {
    const propIds = [
      quote.partida?.project?.propertyId,
      quote.ticket?.propertyId,
      quote.project?.propertyId,
    ].filter((x): x is string => !!x)
    const hasAccess = propIds.some(pid => accessibleIds.includes(pid))
    // Si la cotización no está bound a ninguna propiedad accesible (o no tiene propertyId resolvible), bloquear
    if (propIds.length > 0 && !hasAccess) notFound()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title={quote.quoteNumber ?? `Cotización ${quote.id.slice(-6)}`}
        description={`${quote.vendor.name} — ${formatDate(quote.date)}`}
      >
        <div className="flex gap-2 items-center">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${QUOTE_STATUS_COLORS[quote.status]}`}>
            {QUOTE_STATUSES[quote.status]}
          </span>
          <QuoteStatusActions quoteId={id} currentStatus={quote.status} />
          <DeleteQuoteButton id={id} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuoteItemsSection quoteId={id} items={quote.items} />
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatGTQ(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatGTQ(quote.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Total</span>
                <span>{formatGTQ(quote.total)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <h3 className="font-medium text-sm mb-2">Proveedor</h3>
            <Link href={`/proveedores/${quote.vendorId}`} className="text-sm hover:underline font-medium">
              {quote.vendor.name}
            </Link>
            <p className="text-xs text-muted-foreground">{VENDOR_CATEGORIES[quote.vendor.category]}</p>
            <p className="text-xs">{quote.vendor.phone}</p>
          </Card>

          {quote.project && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Proyecto</p>
              <Link href={`/proyectos/${quote.projectId}`} className="text-sm hover:underline">{quote.project.name}</Link>
            </Card>
          )}

          {quote.validUntil && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Valida hasta</p>
              <p className="text-sm">{formatDate(quote.validUntil)}</p>
            </Card>
          )}

          {quote.notes && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm">{quote.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
