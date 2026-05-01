import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { VENDOR_CATEGORIES } from "@/lib/schemas/vendor"
import { Users, Plus, Star } from "lucide-react"

export default async function ProveedoresPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { quotes: true } } },
    orderBy: { name: "asc" },
  })

  const active = vendors.filter(v => v.isActive)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Proveedores" description={`${active.length} activos · ${vendors.length} total`}>
        <Button asChild>
          <Link href="/proveedores/nuevo"><Plus className="size-4 mr-1" />Nuevo proveedor</Link>
        </Button>
      </PageHeader>

      {vendors.length === 0 ? (
        <Card><EmptyState icon={Users} title="Sin proveedores" description="Registra el primer proveedor." action={{ label: "Nuevo proveedor", href: "/proveedores/nuevo" }} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(v => (
            <Link key={v.id} href={`/proveedores/${v.id}`}>
              <Card className={`p-4 hover:border-foreground/20 transition-colors cursor-pointer h-full ${!v.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium">{v.name}</p>
                  {v.rating && (
                    <div className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                      <Star className="size-3 fill-amber-500" />
                      {v.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{VENDOR_CATEGORIES[v.category]}</p>
                {v.contactName && <p className="text-xs text-muted-foreground mt-1">{v.contactName}</p>}
                <p className="text-xs text-muted-foreground">{v.phone}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{v._count.quotes} cotizaciones</span>
                  {!v.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
