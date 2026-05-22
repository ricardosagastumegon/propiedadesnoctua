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
import { getContractStatus, STATUS_LABELS, STATUS_VARIANTS } from "@/lib/contracts"
import { PAYMENT_FREQUENCY } from "@/lib/schemas/contract"
import { RegisterPaymentDialog } from "./_register-payment"
import { CreateInvoiceDialog } from "./_create-invoice"
import { ContractStatusActions } from "./_status-actions"
import { assertPropertyAccess } from "@/lib/permissions"
import { Receipt, CreditCard } from "lucide-react"

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const contract = await prisma.contract.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: true,
      unit: true,
      tenant: true,
      invoices: { orderBy: { issueDate: "desc" } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  })
  if (!contract) notFound()
  await assertPropertyAccess(
    { id: session.user.id, role: session.user.role, organizationId: orgId },
    contract.propertyId,
  )

  const displayStatus = getContractStatus(contract)
  const totalPaid = contract.payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title={contract.contractNumber}
        description={`${contract.property.name} · ${contract.tenant.fullName}`}
      >
        <ContractStatusActions id={id} currentStatus={contract.status} />
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Estado", value: <Badge variant={STATUS_VARIANTS[displayStatus]}>{STATUS_LABELS[displayStatus]}</Badge> },
          { label: "Renta mensual", value: formatGTQ(contract.monthlyRent) },
          { label: "Total cobrado", value: formatGTQ(totalPaid) },
          { label: "Deposito", value: contract.deposit ? formatGTQ(contract.deposit) : "—" },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
            <div className="font-display text-lg">{value}</div>
          </Card>
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Detalles del contrato</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Inicio</dt><dd>{formatDate(contract.startDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Vencimiento</dt><dd>{formatDate(contract.endDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Dia de pago</dt><dd>Dia {contract.paymentDueDay}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Frecuencia</dt><dd>{PAYMENT_FREQUENCY[contract.paymentFrequency] ?? contract.paymentFrequency}</dd></div>
            {contract.lateFeePercent != null && <div className="flex justify-between"><dt className="text-muted-foreground">Mora</dt><dd>{contract.lateFeePercent}%</dd></div>}
            {contract.annualIncrease != null && <div className="flex justify-between"><dt className="text-muted-foreground">Incremento anual</dt><dd>{contract.annualIncrease}%</dd></div>}
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Partes</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted-foreground text-xs">Propiedad</dt>
              <dd><Link href={`/propiedades/${contract.propertyId}`} className="hover:underline font-medium">{contract.property.name}</Link></dd>
            </div>
            {contract.unit && <div><dt className="text-muted-foreground text-xs">Unidad</dt><dd>{contract.unit.unitNumber}</dd></div>}
            <div><dt className="text-muted-foreground text-xs">Inquilino</dt>
              <dd><Link href={`/inquilinos/${contract.tenantId}`} className="hover:underline font-medium">{contract.tenant.fullName}</Link></dd>
            </div>
            <div><dt className="text-muted-foreground text-xs">Telefono</dt><dd>{contract.tenant.phone}</dd></div>
          </dl>
        </Card>
      </div>

      {/* Invoices */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg">Facturas</h2>
          <CreateInvoiceDialog contractId={id} monthlyRent={contract.monthlyRent} />
        </div>
        {contract.invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="Sin facturas" description="Genera la primera factura de este contrato." className="border rounded-xl" />
        ) : (
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Emision</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contract.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                    <TableCell>{formatDate(inv.issueDate)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="tabular-nums">{formatGTQ(inv.total)}</TableCell>
                    <TableCell className="tabular-nums">{formatGTQ(inv.paidAmount)}</TableCell>
                    <TableCell><Badge variant={inv.status === "PAID" ? "default" : "secondary"}>{inv.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg">Pagos recibidos</h2>
          <RegisterPaymentDialog contractId={id} invoices={contract.invoices} />
        </div>
        {contract.payments.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sin pagos" description="Registra el primer pago de este contrato." className="border rounded-xl" />
        ) : (
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contract.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="tabular-nums font-medium">{formatGTQ(p.amount)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{p.reference ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.notes ?? "—"}</TableCell>
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
