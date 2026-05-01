import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { formatDate, formatGTQ } from "@/lib/format"
import { ASSET_CATEGORIES, ASSET_STATUSES, ASSET_STATUS_COLORS } from "@/lib/schemas/asset"
import { DeleteAssetButton } from "./_delete-button"
import { ServiceLogSection } from "./_service-log"
import { AlertTriangle, Building2, Calendar, Hash, MapPin, Tag } from "lucide-react"

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const asset = await prisma.asset.findFirst({
    where: { id, organizationId: orgId },
    include: { property: true, serviceLogs: { orderBy: { date: "desc" } } },
  })
  if (!asset) notFound()

  const lastLog = asset.serviceLogs[0]
  const today = new Date()
  const daysToService = lastLog?.nextServiceAt
    ? Math.ceil((new Date(lastLog.nextServiceAt).getTime() - today.getTime()) / 86400000)
    : null
  const warrantyExpired = asset.warranty && new Date(asset.warranty) < today

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title={asset.name} description={`${ASSET_CATEGORIES[asset.category]} — ${ASSET_STATUSES[asset.status]}`}>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/activos/${id}/editar`}>Editar</Link>
          </Button>
          <DeleteAssetButton id={id} />
        </div>
      </PageHeader>

      {daysToService !== null && daysToService <= 30 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Proximo servicio en <strong>{daysToService} dias</strong> ({formatDate(lastLog!.nextServiceAt!)})
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ServiceLogSection assetId={id} logs={asset.serviceLogs} />
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Informacion</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-muted-foreground shrink-0" />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ASSET_STATUS_COLORS[asset.status]}`}>
                  {ASSET_STATUSES[asset.status]}
                </span>
              </div>
              {asset.property && (
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground shrink-0" />
                  <Link href={`/propiedades/${asset.propertyId}`} className="hover:underline">{asset.property.name}</Link>
                </div>
              )}
              {asset.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <span>{asset.location}</span>
                </div>
              )}
              {asset.serialNumber && (
                <div className="flex items-center gap-2">
                  <Hash className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs">{asset.serialNumber}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Financiero</h3>
            <div className="space-y-2 text-sm">
              {asset.purchaseDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compra</span>
                  <span>{formatDate(asset.purchaseDate)}</span>
                </div>
              )}
              {asset.purchaseCost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo compra</span>
                  <span>{formatGTQ(asset.purchaseCost)}</span>
                </div>
              )}
              {asset.currentValue != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor actual</span>
                  <span className="font-medium">{formatGTQ(asset.currentValue)}</span>
                </div>
              )}
              {asset.warranty && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Garantia</span>
                  <span className={warrantyExpired ? "text-destructive" : ""}>{formatDate(asset.warranty)}</span>
                </div>
              )}
            </div>
          </Card>

          {asset.notes && (
            <Card className="p-4">
              <h3 className="font-medium text-sm mb-2">Notas</h3>
              <p className="text-sm text-muted-foreground">{asset.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
