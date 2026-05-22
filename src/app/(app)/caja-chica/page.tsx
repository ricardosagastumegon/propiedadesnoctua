import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { formatGTQ } from "@/lib/format"
import { getAccessiblePropertyIds } from "@/lib/permissions"
import { Wallet, TrendingDown, TrendingUp, AlertCircle } from "lucide-react"

export default async function CajaChicaListPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const accessibleIds = await getAccessiblePropertyIds({
    id: session.user.id, role: session.user.role, organizationId: orgId,
  })

  const properties = await prisma.property.findMany({
    where: {
      organizationId: orgId,
      ...(accessibleIds !== null ? { id: { in: accessibleIds } } : {}),
    },
    include: {
      pettyCash: {
        include: {
          movements: { orderBy: { date: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  // Auto-create pettyCash for properties that don't have one
  const withoutCash = properties.filter(p => !p.pettyCash)
  if (withoutCash.length > 0) {
    await Promise.all(
      withoutCash.map(p =>
        prisma.pettyCash.create({ data: { organizationId: orgId, propertyId: p.id, balance: 0 } })
      )
    )
    redirect("/caja-chica")
  }

  const totalBalance = properties.reduce((s, p) => s + (p.pettyCash?.balance ?? 0), 0)
  const lowBalance = properties.filter(p => (p.pettyCash?.balance ?? 0) < 200)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Caja Chica" description="Fondos de caja chica por propiedad." />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <Wallet className="size-8 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Balance total</p>
            <p className="font-display text-xl tabular-nums">{formatGTQ(totalBalance)}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <TrendingUp className="size-8 text-blue-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Propiedades</p>
            <p className="font-display text-xl">{properties.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <AlertCircle className="size-8 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Saldo bajo (&lt;Q200)</p>
            <p className="font-display text-xl">{lowBalance.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map(p => {
          const pc = p.pettyCash!
          const pct = pc.maxBalance > 0 ? Math.min(100, (pc.balance / pc.maxBalance) * 100) : 0
          const isLow = pc.balance < 200
          return (
            <Link key={p.id} href={`/caja-chica/${p.id}`}>
              <Card className="p-5 hover:border-foreground/30 transition-colors cursor-pointer h-full">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.city}</p>
                  </div>
                  {isLow && <AlertCircle className="size-4 text-amber-500 shrink-0" />}
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Balance</span>
                    <span className={`font-medium tabular-nums ${isLow ? "text-amber-600" : "text-emerald-600"}`}>
                      {formatGTQ(pc.balance)}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${isLow ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    max {formatGTQ(pc.maxBalance)}
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
