import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatGTQ } from "@/lib/format"
import { VENDOR_CATEGORIES, QUOTE_STATUSES, QUOTE_STATUS_COLORS } from "@/lib/schemas/vendor"
import { DeleteVendorButton } from "./_delete-button"
import { VendorInvoices } from "./_vendor-invoices"
import { VendorStatementTab } from "./_vendor-statement"
import { getVendorStatement } from "@/lib/vendor-statements"
import { Mail, Phone, MapPin, Star } from "lucide-react"

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const [vendor, statement] = await Promise.all([
    prisma.vendor.findFirst({
      where: { id, organizationId: orgId },
      include: {
        quotes: { orderBy: { date: "desc" }, take: 10 },
        vendorInvoices: { orderBy: { date: "desc" } },
      },
    }),
    getVendorStatement(id, orgId),
  ])
  if (!vendor) notFound()

  const pendingInvoices = vendor.vendorInvoices.filter(i => i.status !== "PAID" && i.status !== "REJECTED")

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title={vendor.name} description={VENDOR_CATEGORIES[vendor.category]}>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/proveedores/${id}/editar`}>Editar</Link>
          </Button>
          <DeleteVendorButton id={id} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="cotizaciones">
            <TabsList className="mb-4">
              <TabsTrigger value="cotizaciones">Cotizaciones ({vendor.quotes.length})</TabsTrigger>
              <TabsTrigger value="facturas">
                Facturas ({vendor.vendorInvoices.length})
                {pendingInvoices.length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full size-4 inline-flex items-center justify-center">
                    {pendingInvoices.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="estado-cuenta">
                Estado de cuenta
                {statement.totalBalance > 0 && (
                  <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs rounded-full px-1.5">
                    {formatGTQ(statement.totalBalance)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cotizaciones">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-sm">Cotizaciones</h3>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/cotizaciones/nueva?vendorId=${id}`}>Nueva cotizacion</Link>
                  </Button>
                </div>
                {vendor.quotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin cotizaciones.</p>
                ) : (
                  <div className="space-y-2">
                    {vendor.quotes.map(q => (
                      <Link key={q.id} href={`/cotizaciones/${q.id}`}>
                        <div className="flex items-center justify-between border rounded-lg p-3 hover:border-foreground/20 transition-colors">
                          <div>
                            <p className="text-sm font-medium font-mono">{q.quoteNumber}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(q.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatGTQ(q.total)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${QUOTE_STATUS_COLORS[q.status]}`}>
                              {QUOTE_STATUSES[q.status]}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="facturas">
              <VendorInvoices vendorId={id} invoices={vendor.vendorInvoices} />
            </TabsContent>

            <TabsContent value="estado-cuenta">
              <Card className="p-6">
                <VendorStatementTab statement={statement} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Contacto</h3>
            <div className="space-y-2 text-sm">
              {vendor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <span>{vendor.email}</span>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{vendor.address}</span>
                </div>
              )}
              {vendor.rating && (
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />
                  <span>{vendor.rating.toFixed(1)} / 5</span>
                </div>
              )}
            </div>
          </Card>

          {vendor.taxId && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">NIT / RTU</p>
              <p className="font-mono text-sm">{vendor.taxId}</p>
            </Card>
          )}

          {vendor.notes && (
            <Card className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
              <p className="text-sm">{vendor.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
