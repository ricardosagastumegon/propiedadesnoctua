import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { formatGTQ, formatDate } from "@/lib/format"
import { CreditCard, Receipt } from "lucide-react"

export default async function PagosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { organizationId: orgId },
      include: { contract: { include: { tenant: true, property: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      include: { contract: { include: { tenant: true, property: true } } },
      orderBy: { issueDate: "desc" },
    }),
  ])

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const pendingInvoices = invoices.filter((i) => i.status !== "PAID")
  const pendingBalance = pendingInvoices.reduce((s, i) => s + i.balance, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Pagos y Facturas" description="Registro de cobros y facturacion." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total cobrado</div>
          <div className="font-display text-2xl tabular-nums">{formatGTQ(totalPaid)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Facturas pendientes</div>
          <div className="font-display text-2xl tabular-nums">{pendingInvoices.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saldo por cobrar</div>
          <div className="font-display text-2xl tabular-nums">{formatGTQ(pendingBalance)}</div>
        </Card>
      </div>

      <Tabs defaultValue="pagos">
        <TabsList className="mb-4">
          <TabsTrigger value="pagos">Pagos recibidos ({payments.length})</TabsTrigger>
          <TabsTrigger value="facturas">Facturas ({invoices.length})</TabsTrigger>
          <TabsTrigger value="estado">Estado de cuenta</TabsTrigger>
        </TabsList>

        {/* PAGOS */}
        <TabsContent value="pagos">
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin pagos" description="Los pagos aparecen aqui cuando se registran desde un contrato." />
          ) : (
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead>Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.paymentDate)}</TableCell>
                      <TableCell>{p.contract?.tenant.fullName ?? "—"}</TableCell>
                      <TableCell>{p.contract?.property.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums font-medium">{formatGTQ(p.amount)}</TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{p.reference ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* FACTURAS */}
        <TabsContent value="facturas">
          {invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin facturas" description="Las facturas aparecen aqui cuando se generan desde un contrato." />
          ) : (
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Emision</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const isOverdue = inv.status !== "PAID" && new Date(inv.dueDate) < new Date()
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                        <TableCell>{inv.contract?.tenant.fullName ?? "—"}</TableCell>
                        <TableCell>{inv.contract?.property.name ?? "—"}</TableCell>
                        <TableCell>{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className={isOverdue ? "text-destructive font-medium" : ""}>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="tabular-nums">{formatGTQ(inv.total)}</TableCell>
                        <TableCell className="tabular-nums">{formatGTQ(inv.balance)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "PAID" ? "default" : isOverdue ? "destructive" : "secondary"}>
                            {inv.status === "PAID" ? "Pagada" : isOverdue ? "Vencida" : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ESTADO DE CUENTA */}
        <TabsContent value="estado">
          <AccountStatement payments={payments} invoices={invoices} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AccountStatement({ payments, invoices }: { payments: any[]; invoices: any[] }) {
  const byTenant: Record<string, { name: string; property: string; totalInvoiced: number; totalPaid: number; balance: number }> = {}

  for (const inv of invoices) {
    const tenantId = inv.contract?.tenantId
    if (!tenantId) continue
    if (!byTenant[tenantId]) byTenant[tenantId] = { name: inv.contract?.tenant.fullName ?? "—", property: inv.contract?.property.name ?? "—", totalInvoiced: 0, totalPaid: 0, balance: 0 }
    byTenant[tenantId].totalInvoiced += inv.total
    byTenant[tenantId].totalPaid += inv.paidAmount
    byTenant[tenantId].balance += inv.balance
  }

  const rows = Object.values(byTenant)
  if (rows.length === 0) return <EmptyState icon={Receipt} title="Sin datos" description="No hay facturas para mostrar estado de cuenta." />

  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Inquilino</TableHead>
            <TableHead>Propiedad</TableHead>
            <TableHead>Total facturado</TableHead>
            <TableHead>Total cobrado</TableHead>
            <TableHead>Saldo pendiente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.property}</TableCell>
              <TableCell className="tabular-nums">{formatGTQ(r.totalInvoiced)}</TableCell>
              <TableCell className="tabular-nums">{formatGTQ(r.totalPaid)}</TableCell>
              <TableCell className={`tabular-nums font-medium ${r.balance > 0 ? "text-destructive" : "text-emerald-600"}`}>{formatGTQ(r.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
