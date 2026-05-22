import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/ui/page-header"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { BackButton } from "@/components/shared/back-button"
import { formatGTQ, formatDate } from "@/lib/format"
import { ExpenseForm } from "./_expense-form"
import { ReplenishForm } from "./_replenish-form"
import { Wallet, TrendingDown, TrendingUp } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Gasto",
  REPLENISHMENT: "Reposicion",
  ADJUSTMENT: "Ajuste",
}

const TYPE_COLORS: Record<string, string> = {
  EXPENSE: "text-red-600",
  REPLENISHMENT: "text-emerald-600",
  ADJUSTMENT: "text-blue-600",
}

export default async function CajaChicaDetailPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const { propertyId } = await params

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: orgId },
  })
  if (!property) notFound()

  let pc = await prisma.pettyCash.findUnique({
    where: { propertyId },
    include: {
      movements: { orderBy: { date: "desc" } },
    },
  })

  if (!pc) {
    const created = await prisma.pettyCash.create({
      data: { organizationId: orgId, propertyId, balance: 0 },
      include: { movements: true },
    })
    pc = created
  }

  const totalExpenses = pc.movements.filter(m => m.type === "EXPENSE").reduce((s, m) => s + m.amount, 0)
  const totalReplenishments = pc.movements.filter(m => m.type === "REPLENISHMENT").reduce((s, m) => s + m.amount, 0)

  // Group by category for stats
  const byCat: Record<string, number> = {}
  for (const m of pc.movements.filter(m => m.type === "EXPENSE")) {
    const cat = m.category ?? "Sin categoría"
    byCat[cat] = (byCat[cat] ?? 0) + m.amount
  }
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1])

  const pct = pc.maxBalance > 0 ? Math.min(100, (pc.balance / pc.maxBalance) * 100) : 0
  const isLow = pc.balance < 200

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <BackButton href="/caja-chica" label="Caja Chica" />
      <Breadcrumb items={[
        { label: "Caja Chica", href: "/caja-chica" },
        { label: property.name },
      ]} />

      <PageHeader title={`Caja Chica — ${property.name}`} description={property.city} />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="size-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Balance actual</p>
          </div>
          <p className={`font-display text-2xl tabular-nums ${isLow ? "text-amber-600" : "text-emerald-600"}`}>
            {formatGTQ(pc.balance)}
          </p>
          <div className="w-full bg-muted rounded-full h-1 mt-2">
            <div
              className={`h-1 rounded-full ${isLow ? "bg-amber-400" : "bg-emerald-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="size-4 text-red-500" />
            <p className="text-xs text-muted-foreground">Total gastos</p>
          </div>
          <p className="font-display text-2xl tabular-nums text-red-600">{formatGTQ(totalExpenses)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-4 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Total reposiciones</p>
          </div>
          <p className="font-display text-2xl tabular-nums text-emerald-600">{formatGTQ(totalReplenishments)}</p>
        </Card>
      </div>

      <Tabs defaultValue="movimientos">
        <TabsList className="mb-4">
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="nuevo">Nuevo Gasto</TabsTrigger>
          <TabsTrigger value="reponer">Reponer</TabsTrigger>
          <TabsTrigger value="categorias">Por Categoría</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos">
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Historial de movimientos</h3>
            {pc.movements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos.</p>
            ) : (
              <div className="space-y-2">
                {pc.movements.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.type === "EXPENSE" ? "bg-red-50 text-red-700" :
                        m.type === "REPLENISHMENT" ? "bg-emerald-50 text-emerald-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {TYPE_LABELS[m.type]}
                      </div>
                      <div>
                        <p className="text-sm">{m.description}</p>
                        {m.category && <p className="text-xs text-muted-foreground">{m.category}</p>}
                        {m.reference && <p className="text-xs text-muted-foreground">Ref: {m.reference}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium tabular-nums ${TYPE_COLORS[m.type]}`}>
                        {m.type === "EXPENSE" ? "−" : "+"}{formatGTQ(m.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="nuevo">
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Registrar gasto</h3>
            <ExpenseForm propertyId={propertyId} />
          </Card>
        </TabsContent>

        <TabsContent value="reponer">
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Solicitar reposicion de fondos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Si tienes autoridad ALONE, se registra de inmediato. De lo contrario, se envía a autorizaciones.
            </p>
            <ReplenishForm propertyId={propertyId} />
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Gastos por categoria</h3>
            {catEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin gastos registrados.</p>
            ) : (
              <div className="space-y-3">
                {catEntries.map(([cat, total]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{cat}</span>
                      <span className="tabular-nums text-red-600">{formatGTQ(total)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-red-400 rounded-full h-1.5"
                        style={{ width: `${totalExpenses > 0 ? (total / totalExpenses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
